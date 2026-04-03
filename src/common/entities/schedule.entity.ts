import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Building } from './building.entity';
import { Equipment } from './equipment.entity';
import { MaintenanceReport } from './maintenance-report.entity';
import { Technician } from './technician.entity';

@Entity({ name: 'schedules' })
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'varchar', length: 120, default: 'Preventive Maintenance' })
  maintenanceType!: string;

  @Column({ type: 'timestamp without time zone' })
  scheduledDate!: Date;

  @Column({ type: 'varchar', length: 30, default: 'scheduled' })
  status!: string;

  @Column({ type: 'varchar', length: 20, default: 'Medium' })
  priority!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  recurrenceRule!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => Building, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building!: Building;

  @ManyToOne(() => Equipment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'equipment_id' })
  equipment!: Equipment | null;

  @ManyToOne(() => Technician, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_technician_id' })
  assignedTechnician!: Technician | null;

  @ManyToOne(() => MaintenanceReport, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_report_id' })
  linkedReport!: MaintenanceReport | null;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updatedAt!: Date;
}
