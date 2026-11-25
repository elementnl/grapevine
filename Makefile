# Every task in this repo runs through make. Run `make` to list targets.

.DEFAULT_GOAL := help
# Off the common 3000 so it doesn't fight other local projects.
PORT ?= 7300
.PHONY: help install dev build start lint lint-fix format format-check typecheck test test-watch check clean \
	db-start db-stop db-status db-reset db-up db-migration db-types db-check db-deploy \
	db-login db-link db-prod-migrations db-query db-advisors db-repair

help: ## List all targets
	@node -e "const fs=require('fs');const marker=String.fromCharCode(35).repeat(2)+' ';for(const line of fs.readFileSync('Makefile','utf8').split(String.fromCharCode(10))){if(!/^[a-zA-Z_-]+:/.test(line))continue;const sep=line.indexOf(':');const description=line.indexOf(marker);if(description>sep)console.log('  '+line.slice(0,sep).padEnd(20)+' '+line.slice(description+marker.length))}"

install: ## Install dependencies exactly as locked
	npm ci

dev: ## Start the dev server on http://localhost:7300 (override with PORT=)
	npm exec -- next dev --port $(PORT)

build: ## Production build
	npm exec -- next build

start: ## Serve the production build on port 7300 (run `make build` first)
	npm exec -- next start --port $(PORT)

lint: ## Lint with ESLint
	npm exec -- eslint .

lint-fix: ## Lint and auto-fix
	npm exec -- eslint . --fix

format: ## Format all files with Prettier
	npm exec -- prettier --write .

format-check: ## Check formatting without writing
	npm exec -- prettier --check .

typecheck: ## Generate route types, then type-check
	npm exec -- next typegen
	npm exec -- tsc --noEmit

test: ## Run unit tests once
	npm exec -- vitest run

test-watch: ## Run unit tests in watch mode
	npm exec -- vitest

check: format-check lint typecheck test build ## Everything CI runs

clean: ## Remove build output and dependencies
	node -e "const fs=require('fs');for(const path of ['.next','node_modules'])fs.rmSync(path,{recursive:true,force:true});for(const path of fs.readdirSync('.'))if(path.endsWith('.tsbuildinfo'))fs.rmSync(path,{force:true})"

# --- Database (Supabase) ---
# Local development runs against a Supabase stack in Docker, built from
# supabase/migrations. Prod changes only by merging migrations into main:
# .github/workflows/deploy-database.yml runs db-deploy. The prod targets at the
# bottom are for looking, not changing.

SUPABASE = npm exec -- supabase
# Services the app doesn't use, skipped so the local stack starts faster.
# Auth stays: the admin login uses it.
SUPABASE_EXCLUDE = realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor,mailpit

db-start: ## Start the local Supabase stack in Docker (Studio: http://localhost:54323)
	$(SUPABASE) start -x $(SUPABASE_EXCLUDE)

db-stop: ## Stop the local Supabase stack (data is kept)
	$(SUPABASE) stop

db-status: ## Show the local stack's URLs and keys, for .env.local
	$(SUPABASE) status

db-reset: ## Rebuild the local database from scratch: every migration, then seed.sql
	$(SUPABASE) db reset

db-up: ## Apply only new migrations to the local database, keeping its data
	$(SUPABASE) migration up

db-migration: ## Create an empty timestamped migration: make db-migration name=add_guesses
	$(if $(name),,$(error usage: make db-migration name=<snake_case_name>))
	$(SUPABASE) migration new $(name)

db-types: ## Regenerate src/types/database.ts from the local database
	$(SUPABASE) gen types typescript --schema public > src/types/database.ts
	npm exec -- prettier --write src/types/database.ts

db-check: ## CI: apply every migration to a fresh database and check the types match
	$(SUPABASE) db start
	$(SUPABASE) migration up
	$(MAKE) db-types
	git diff --exit-code src/types/database.ts || \
		(echo "src/types/database.ts doesn't match the migrations. Run make db-reset db-types and commit it." && exit 1)

db-deploy: ## CI only: apply pending migrations to prod (needs SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, SUPABASE_PROJECT_ID)
	$(if $(SUPABASE_PROJECT_ID),,$(error db-deploy runs in CI on merge to main; set SUPABASE_PROJECT_ID))
	$(SUPABASE) link --project-ref $(SUPABASE_PROJECT_ID)
	$(SUPABASE) db push --remote --yes

# Prod, read-only: for checking on prod when something looks wrong.

db-login: ## Prod: log the Supabase CLI in to your account (once per machine)
	$(SUPABASE) login

db-link: ## Prod: link this repo to the project (once per machine): make db-link ref=<project-ref>
	$(if $(ref),,$(error usage: make db-link ref=<project-ref>))
	$(SUPABASE) link --project-ref $(ref)

db-prod-migrations: ## Prod: list migration files next to what prod has applied
	$(SUPABASE) migration list --remote

db-query: ## Prod, read-only: make db-query sql="select 1" or file=path.sql
	$(if $(or $(sql),$(file)),,$(error usage: make db-query sql="<sql>" or make db-query file=<path.sql>))
	$(SUPABASE) db query --remote --read-only $(if $(file),--file $(file),"$(sql)")

db-advisors: ## Prod: check for security and performance issues
	$(SUPABASE) db advisors --remote

db-repair: ## Prod, emergencies only: fix migration history, runs no SQL: make db-repair version=<ts> status=applied|reverted
	$(if $(and $(version),$(status)),,$(error usage: make db-repair version=<timestamp> status=applied|reverted))
	$(SUPABASE) migration repair --remote --status $(status) $(version)
