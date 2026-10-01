.PHONY: skill check clean help

help:
	@echo "fleeet Agent Kit"
	@echo "  make skill   Build dist/fleeet-skill.zip (claude.ai custom skill upload)"
	@echo "  make check   Syntax-check the CLI and validate JSON manifests"
	@echo "  make clean   Remove dist/"

skill:
	@rm -rf dist && mkdir -p dist
	@python3 -m zipfile -c dist/fleeet-skill.zip skills/fleeet-reporting
	@echo "Created dist/fleeet-skill.zip"

check:
	@npm run -s check && echo "ok"

clean:
	@rm -rf dist
