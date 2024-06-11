.PHONY: build dev up install

build: up
	ddev exec npm run build
dev: build
	ddev exec npm run serve
install: up build
	ddev exec php craft setup/app-id \
		$(filter-out $@,$(MAKECMDGOALS))
	ddev exec php craft setup/security-key \
		$(filter-out $@,$(MAKECMDGOALS))
	ddev exec php craft install \
		$(filter-out $@,$(MAKECMDGOALS))
	ddev exec php craft plugin/install ckeditor
	ddev exec php craft plugin/install cp-field-inspect
	ddev exec php craft plugin/install hyper
	ddev exec php craft plugin/install seomatic
	ddev exec php craft plugin/install vite
up:
	if [ ! "$$(ddev describe | grep OK)" ]; then \
        ddev auth ssh; \
        ddev start; \
    fi
push-assets-stage:
	rsync -avz --progress web/volumes/local/assets/ rootsy-forge:/home/forge/stage.huwroberts.dev/web/volumes/local/assets/

push-assets-prod:
	rsync -avz --progress web/volumes/local/assets/ rootsy-forge:/home/forge/huwroberts.dev/web/volumes/local/assets/

%:
	@:
# ref: https://stackoverflow.com/questions/6273608/how-to-pass-argument-to-makefile-from-command-line
