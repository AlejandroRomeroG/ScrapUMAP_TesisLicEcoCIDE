.PHONY: scrape clusters web-install web-data web-build web-check web-dev

QUARTO ?= $(shell if [ -x .tools/quarto/bin/quarto ]; then echo .tools/quarto/bin/quarto; else echo quarto; fi)

scrape:
	LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 $(QUARTO) render ScrapingTesisLicEcoCIDE.qmd --execute

clusters:
	.venv/bin/jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=-1 --inplace mapa_semantico_tesis.ipynb
	.venv/bin/jupyter nbconvert --to notebook --ClearOutputPreprocessor.enabled=True --inplace mapa_semantico_tesis.ipynb

web-install:
	npm --prefix web install

web-data:
	.venv/bin/python scripts/export_web_data.py

web-build: web-data
	npm --prefix web run build

web-check: web-data
	npm --prefix web run check

web-dev: web-data
	npm --prefix web run dev -- --host 127.0.0.1
