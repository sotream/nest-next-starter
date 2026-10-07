# 0005. Kafka is optional and sits behind a port

- Status: accepted
- Date: 2026-10-07

## Context

Messaging is useful to learn and extend but should not be required to run the app. A broker that must
be up for the API to boot raises the cost of every local session and every CI job.

## Decision

- `KAFKA_ENABLED=false` by default. The API then binds a `NoopEventPublisher` and never opens a broker
  connection, so it boots with the broker stopped or unreachable.
- Services publish through the `EventPublisher` port (`infrastructure/messaging`). The Kafka adapter
  uses `kafkajs`, JSON payloads and a message key for per-key ordering.
- Publishing `vehicle.created` is best effort: the vehicle is saved first, and a broker failure is
  logged but does not fail the request.
- A minimal `VehicleCreatedConsumer` shows the consuming side and only runs when Kafka is enabled.
- Compose runs a single-node KRaft broker (no ZooKeeper) with separate listeners for containers and
  for the host.

## Consequences

- Events can be lost if the broker is down at publish time, and the database commit and the publish are
  not atomic. When delivery must be guaranteed, replace best effort with a transactional outbox: write
  the event in the same transaction, then relay it.
- Consumers should be idempotent: Kafka delivers at least once, so a message can arrive twice.
- Swapping the broker means writing one adapter and changing one provider.
