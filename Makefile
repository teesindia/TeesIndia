.PHONY: run dev backend frontend

run: dev

dev:
	$(MAKE) -j 2 backend frontend

backend:
	cd backend && npm run dev

frontend:
	cd frontend && npm run dev
