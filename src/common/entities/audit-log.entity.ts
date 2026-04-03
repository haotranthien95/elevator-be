import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  actorEmail!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  actorName!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  actorRole!: string | null;

  @Column({ type: 'varchar', length: 80 })
  action!: string;

  @Column({ type: 'varchar', length: 80 })
  resourceType!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  resourceId!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  resourceLabel!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  createdAt!: Date;
}
