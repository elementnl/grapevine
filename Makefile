# Every task in this repo runs through make. Run `make` to list targets.

BIN := node_modules/.bin
SUPABASE := $(BIN)/supabase

.DEFAULT_GOAL := help
.PHONY: help install dev build start lint lint-fix format format-check typecheck test test-watch check clean \
	db-login db-link db-migration db-status db-push-dry db-push db-repair db-types db-query db-advisors

help: ## List all targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies exactly as locked
	npm ci

dev: ## Start the dev server on http://localhost:3000
	$(BIN)/next dev

build: ## Production build
	$(BIN)/next build

start: ## Serve the production build (run `make build` first)
	$(BIN)/next start

lint: ## Lint with ESLint
	$(BIN)/eslint .

lint-fix: ## Lint and auto-fix
	$(BIN)/eslint . --fix

format: ## Format all files with Prettier
	$(BIN)/prettier --write .

format-check: ## Check formatting without writing
	$(BIN)/prettier --check .

typecheck: ## Generate route types, then type-check
	$(BIN)/next typegen
	$(BIN)/tsc --noEmit

test: ## Run unit tests once
	$(BIN)/vitest run

test-watch: ## Run unit tests in watch mode
	$(BIN)/vitest

check: format-check lint typecheck test build ## Everything CI runs

clean: ## Remove build output and dependencies
	rm -rf .next node_modules *.tsbuildinfo

# --- Database (Supabase, production only; no local stack) ---

db-login: ## Log the Supabase CLI in to your account (once per machine)
	$(SUPABASE) login

db-link: ## Link this repo to the prod project (once per machine): make db-link ref=<project-ref>
	$(if $(ref),,$(error usage: make db-link ref=<project-ref>))
	$(SUPABASE) link --project-ref $(ref)

db-migration: ## Create an empty timestamped migration: make db-migration name=add_guesses
	$(if $(name),,$(error usage: make db-migration name=<snake_case_name>))
	$(SUPABASE) migration new $(name)

db-status: ## List migrations: local files vs applied on prod
	$(SUPABASE) migration list --linked

db-push-dry: ## Show which migrations db-push would apply to prod
	$(SUPABASE) db push --linked --dry-run

db-push: ## Apply pending migrations to prod (add yes=1 to skip the prompt)
	$(SUPABASE) db push --linked $(if $(yes),--yes)

db-repair: ## Fix migration history only, runs no SQL: make db-repair version=<ts> status=applied|reverted
	$(if $(and $(version),$(status)),,$(error usage: make db-repair version=<timestamp> status=applied|reverted))
	$(SUPABASE) migration repair --linked --status $(status) $(version)

db-types: ## Regenerate src/types/database.ts from the prod schema
	$(SUPABASE) gen types typescript --linked --schema public > src/types/database.ts
	$(BIN)/prettier --write src/types/database.ts

db-query: ## Run SQL on prod: make db-query sql="select 1" or file=path.sql
	$(if $(or $(sql),$(file)),,$(error usage: make db-query sql="<sql>" or make db-query file=<path.sql>))
	$(SUPABASE) db query --linked $(if $(file),--file $(file),"$(sql)")

db-advisors: ## Check prod for security and performance issues
	$(SUPABASE) db advisors --linked
