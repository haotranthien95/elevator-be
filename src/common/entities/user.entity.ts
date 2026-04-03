import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const USER_ROLES = ['admin', 'dispatcher', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email!: string;

  @Column({ type: 'text' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 20, default: 'viewer' })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updatedAt!: Date;
}
