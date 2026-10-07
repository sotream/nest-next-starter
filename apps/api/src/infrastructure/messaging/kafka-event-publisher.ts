import { Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Partitioners } from 'kafkajs';
import type { Kafka, Producer } from 'kafkajs';
import type { EventPublisher, PublishedEvent } from './event-publisher.port.js';

/** kafkajs adapter for the EventPublisher port. Messages are JSON, keyed for per-key ordering. */
export class KafkaEventPublisher implements EventPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaEventPublisher.name);
  private readonly producer: Producer;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
    this.logger.log('Kafka producer connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  async publish<T>(topic: string, { key, payload }: PublishedEvent<T>): Promise<void> {
    await this.producer.send({ topic, messages: [{ key, value: JSON.stringify(payload) }] });
  }
}
