import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'alert_acknowledgements' })
export class AlertAcknowledgement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 180, unique: true })
  alertKey!: string;

  @Column({ type: 'varchar', length: 60 })
  alertType!: string;

  @Column({ type: 'varchar', length: 80 })
  resourceType!: string;

  @Column({ type: 'varchar', length: 120 })
  resourceId!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  resourceLabel!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'acknowledged' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'timestamp without time zone', nullable: true })
  snoozedUntil!: Date | null;

  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  acknowledgedAt!: Date;

  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  actorEmail!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  actorName!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  actorRole!: string | null;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updatedAt!: Date;
}
