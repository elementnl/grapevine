# Every task in this repo runs through make. Run `make` to list targets.

.DEFAULT_GOAL := help
.PHONY: help install dev build start lint lint-fix format format-check typecheck test test-watch check clean \
	db-login db-link db-migration db-status db-push-dry db-push db-repair db-types db-query db-advisors

help: ## List all targets
	@node -e "const fs=require('fs');const marker=String.fromCharCode(35).repeat(2)+' ';for(const line of fs.readFileSync('Makefile','utf8').split(String.fromCharCode(10))){if(!/^[a-zA-Z_-]+:/.test(line))continue;const sep=line.indexOf(':');const description=line.indexOf(marker);if(description>sep)console.log('  '+line.slice(0,sep).padEnd(14)+' '+line.slice(description+marker.length))}"

install: ## Install dependencies exactly as locked
	npm ci

dev: ## Start the dev server on http://localhost:3000
	npm exec -- next dev

build: ## Production build
	npm exec -- next build

start: ## Serve the production build (run `make build` first)
	npm exec -- next start

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

# --- Database (Supabase, production only; no local stack) ---

db-login: ## Log the Supabase CLI in to your account (once per machine)
	npm exec -- supabase login

db-link: ## Link this repo to the prod project (once per machine): make db-link ref=<project-ref>
	$(if $(ref),,$(error usage: make db-link ref=<project-ref>))
	npm exec -- supabase link --project-ref $(ref)

db-migration: ## Create an empty timestamped migration: make db-migration name=add_guesses
	$(if $(name),,$(error usage: make db-migration name=<snake_case_name>))
	npm exec -- supabase migration new $(name)

db-status: ## List migrations: local files vs applied on prod
	npm exec -- supabase migration list --linked

db-push-dry: ## Show which migrations db-push would apply to prod
	npm exec -- supabase db push --linked --dry-run

db-push: ## Apply pending migrations to prod (add yes=1 to skip the prompt)
	npm exec -- supabase db push --linked $(if $(yes),--yes)

db-repair: ## Fix migration history only, runs no SQL: make db-repair version=<ts> status=applied|reverted
	$(if $(and $(version),$(status)),,$(error usage: make db-repair version=<timestamp> status=applied|reverted))
	npm exec -- supabase migration repair --linked --status $(status) $(version)

db-types: ## Regenerate src/types/database.ts from the prod schema
	npm exec -- supabase gen types typescript --linked --schema public > src/types/database.ts
	npm exec -- prettier --write src/types/database.ts

db-query: ## Run SQL on prod: make db-query sql="select 1" or file=path.sql
	$(if $(or $(sql),$(file)),,$(error usage: make db-query sql="<sql>" or make db-query file=<path.sql>))
	npm exec -- supabase db query --linked $(if $(file),--file $(file),"$(sql)")

db-advisors: ## Check prod for security and performance issues
	npm exec -- supabase db advisors --linked
