import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka } from 'kafkajs';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { EVENT_PUBLISHER } from './event-publisher.port.js';
import type { EventPublisher } from './event-publisher.port.js';
import { KafkaEventPublisher } from './kafka-event-publisher.js';
import { KAFKA_CLIENT } from './messaging.constants.js';
import { NoopEventPublisher } from './noop-event-publisher.js';

type AppConfig = ConfigService<EnvironmentVariables, true>;

@Global()
@Module({
  providers: [
    {
      // Creating the client does not open a connection, so this is safe without a broker.
      provide: KAFKA_CLIENT,
      inject: [ConfigService],
      useFactory: (config: AppConfig) =>
        new Kafka({
          clientId: config.get('KAFKA_CLIENT_ID', { infer: true }),
          brokers: config.get('KAFKA_BROKERS', { infer: true }).split(','),
        }),
    },
    {
      provide: EVENT_PUBLISHER,
      inject: [ConfigService, KAFKA_CLIENT],
      useFactory: (config: AppConfig, kafka: Kafka): EventPublisher =>
        config.get('KAFKA_ENABLED', { infer: true })
          ? new KafkaEventPublisher(kafka)
          : new NoopEventPublisher(),
    },
  ],
  exports: [EVENT_PUBLISHER, KAFKA_CLIENT],
})
export class MessagingModule {}
