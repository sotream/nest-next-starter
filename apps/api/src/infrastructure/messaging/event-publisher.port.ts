export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

export interface PublishedEvent<T> {
  /** Routing key: events with the same key keep their order. */
  key: string;
  payload: T;
}

/**
 * Port for publishing domain events. The one place we keep an interface, because the broker is an
 * external system we may realistically swap (see docs/adr/0005-kafka-optional.md).
 */
export interface EventPublisher {
  publish<T>(topic: string, event: PublishedEvent<T>): Promise<void>;
}
