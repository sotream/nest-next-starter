import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka } from 'kafkajs';
import type { Consumer } from 'kafkajs';
import type { EnvironmentVariables } from '../../infrastructure/config/env.validation.js';
import { KAFKA_CLIENT } from '../../infrastructure/messaging/messaging.constants.js';
import { VEHICLE_CREATED_TOPIC } from './vehicle-events.js';

/**
 * Minimal example consumer: logs each `vehicle.created` event. Copy it as a starting point for real
 * consumers; it only runs when KAFKA_ENABLED=true.
 */
@Injectable()
export class VehicleCreatedConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(VehicleCreatedConsumer.name);
  private consumer?: Consumer;

  constructor(
    @Inject(KAFKA_CLIENT) private readonly kafka: Kafka,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.get('KAFKA_ENABLED', { infer: true })) {
      return;
    }
    this.consumer = this.kafka.consumer({
      groupId: this.config.get('KAFKA_GROUP_ID', { infer: true }),
    });
    await this.ensureTopicExists();
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: VEHICLE_CREATED_TOPIC, fromBeginning: true });
    await this.consumer.run({
      eachMessage: ({ message }) => {
        this.logger.log(`Received ${VEHICLE_CREATED_TOPIC}: ${message.value?.toString()}`);
        return Promise.resolve();
      },
    });
  }

  /** Subscribing to a missing topic fails, and auto-creation only happens on first produce. */
  private async ensureTopicExists(): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();
    try {
      await admin.createTopics({
        topics: [{ topic: VEHICLE_CREATED_TOPIC }],
        waitForLeaders: true,
      });
    } finally {
      await admin.disconnect();
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.consumer?.disconnect();
  }
}
