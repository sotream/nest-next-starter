# Kafka walkthrough

Kafka is optional ([ADR 0005](../adr/0005-kafka-optional.md)). This guide runs the included example and
suggests ways to extend it.

## 1. Start the broker and enable publishing

```bash
pnpm infra:up                 # includes Kafka and Kafka UI
KAFKA_ENABLED=true pnpm dev   # or set KAFKA_ENABLED=true in .env
```

Startup logs show `Kafka producer connected`. With `KAFKA_ENABLED=false` (default) the API never
contacts the broker.

## 2. Produce an event

Sign in (see [Authentication](authentication.md)) and create a vehicle in the web app or with
`POST /api/v1/vehicles`. The API publishes to topic `vehicle.created`, keyed by vehicle id:

```json
{ "id": "…", "plateNumber": "…", "ownerId": "…", "occurredAt": "2026-10-07T11:00:00.000Z" }
```

## 3. See it

- Kafka UI at http://localhost:8080: Topics, `vehicle.created`, Messages.
- API logs: the example consumer prints `Received vehicle.created: …`.
- Or from the broker container:
  `docker compose exec kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:19092 --topic vehicle.created --from-beginning`

## Listeners

The broker has two listeners. Applications on your machine use `localhost:9092`; containers such as
Kafka UI use `kafka:19092`. Change `KAFKA_BROKERS` if you move the host port (`KAFKA_PORT`).

## Ideas to extend it

1. Publish `vehicle.updated` and `vehicle.deleted` from `VehiclesService`, with the topic names and
   payload types next to `vehicle-events.ts`.
2. Add a second consumer with a different `groupId` and see that both receive every message.
3. Start two API instances with the same group and watch partitions get shared. Create the topic with
   several partitions first so there is something to share.
4. Stop the broker, create a vehicle, and read the warning log: the request still succeeds. Then read
   the consequences section of the ADR and sketch an outbox table.
5. Make the consumer idempotent by recording processed event ids.
