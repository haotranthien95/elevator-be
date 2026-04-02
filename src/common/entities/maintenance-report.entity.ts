import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Equipment } from './equipment.entity';
import { Building } from './building.entity';

type MaintenanceReportPhoto = {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

@Entity({ name: 'maintenance_reports' })
export class MaintenanceReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Building, { nullable: false })
  @JoinColumn({ name: 'building_id' })
  building: Building;

  @ManyToOne(() => Equipment, (equipment) => equipment.reports, { nullable: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  reportCode: string | null;

  @Column({ type: 'varchar', length: 120 })
  maintenanceType: string;

  @Column({ type: 'timestamp without time zone' })
  arrivalDateTime: Date;

  @Column({ type: 'varchar', length: 120 })
  technicianName: string;

  @Column({ type: 'varchar', length: 40, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  findings: string | null;

  @Column({ type: 'text', nullable: true })
  workPerformed: string | null;

  @Column({ type: 'jsonb', nullable: true })
  partsUsed: Array<{ name: string; quantity: number }> | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photos: MaintenanceReportPhoto[] | null;

  @Column({ type: 'text', nullable: true })
  technicianSignature: string | null;

  @Column({ type: 'text', nullable: true })
  customerSignature: string | null;

  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updatedAt: Date;
}
