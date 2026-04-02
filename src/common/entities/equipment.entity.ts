import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Building } from './building.entity';
import { MaintenanceReport } from './maintenance-report.entity';

@Entity({ name: 'equipment' })
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  equipmentType: string;

  @Column({ type: 'varchar', length: 80 })
  equipmentCode: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  serialNumber: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  model: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  location: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Building, (building) => building.equipment, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  building: Building;

  @OneToMany(() => MaintenanceReport, (report) => report.equipment)
  reports: MaintenanceReport[];
}
