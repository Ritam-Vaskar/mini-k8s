# K8s Mini Scheduler API

Mini job scheduler that runs Docker containers via an Express API with PostgreSQL + Drizzle.

## Quick start

1) Copy .env.example to .env and set DATABASE_URL.
2) Install dependencies.
3) Generate and run migrations.
4) Start the API.

## API overview

- POST /jobs
- GET /jobs
- GET /jobs/:id
- PATCH /jobs/:id
- POST /jobs/:id/run
- GET /jobs/:id/runs
- GET /runs/:id
- POST /runs/:id/cancel

## Job payloads

Create a cron job:

```json
{
	"name": "hello-cron",
	"image": "alpine:latest",
	"command": "echo hello",
	"schedule": {
		"type": "cron",
		"cron": "*/1 * * * *"
	}
}
```

Create an interval job:

```json
{
	"name": "hello-interval",
	"image": "alpine:latest",
	"command": "echo ping",
	"schedule": {
		"type": "interval",
		"seconds": 30
	}
}
```

Create a one-time job:

```json
{
	"name": "hello-once",
	"image": "alpine:latest",
	"command": "echo once",
	"schedule": {
		"type": "once",
		"runAt": "2026-05-07T12:00:00.000Z"
	}
}
```

