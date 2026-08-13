import {
  ProjectModel,
  FeatureModel,
  ServiceModel,
  DeveloperModel,
  getModelByType
} from '../models/index.js';
import { cognoService } from '../services/cognoService.js';
import { EntityType, RelationshipType } from '../types/index.js';

export async function seedDatabase() {
  console.log('--- Starting Database Seeding ---');

  // 1. Clean existing records across all split collections
  await Promise.all([
    ProjectModel.deleteMany({}),
    FeatureModel.deleteMany({}),
    ServiceModel.deleteMany({}),
    DeveloperModel.deleteMany({})
  ]);

  console.log('Cleaning live CognoDB graph nodes and relationships...');
  await cognoService.clearGraph();

  // 2. Define Entities Data
  const entitiesToCreate: Array<{ name: string; type: EntityType; description: string }> = [
    // Project
    { name: 'E-Commerce Platform', type: 'PROJECT', description: 'Enterprise core shopping platform' },

    // Features
    { name: 'Checkout', type: 'FEATURE', description: 'Shopping cart checkout flow' },
    { name: 'Payment', type: 'FEATURE', description: 'Credit card and wallet processing interface' },
    { name: 'Order Tracking', type: 'FEATURE', description: 'Real-time parcel delivery status tracking' },
    { name: 'Notifications', type: 'FEATURE', description: 'Email and SMS notification triggers' },

    // Services
    { name: 'Order Service', type: 'SERVICE', description: 'Manages cart, pricing, and order creation' },
    { name: 'Payment Service', type: 'SERVICE', description: 'Integrates with stripe, handles gateway transactions' },
    { name: 'Shipping Service', type: 'SERVICE', description: 'Interfaces with DHL/FedEx logistics APIs' },
    { name: 'Notification Service', type: 'SERVICE', description: 'Dispatches customer push alerts' },

    // Developers
    { name: 'Alice', type: 'DEVELOPER', description: 'Lead Backend Engineer - Payments' },
    { name: 'Bob', type: 'DEVELOPER', description: 'Senior Platform Engineer - Core Services' },
    { name: 'Charlie', type: 'DEVELOPER', description: 'Logistics integrations engineer' }
  ];

  // 3. Save Entities in MongoDB (resolving correct collection dynamically)
  const createdEntities: Record<string, string> = {}; // Mapping name -> MongoDB ID

  for (const item of entitiesToCreate) {
    const Model = getModelByType(item.type);
    const doc = new Model({
      name: item.name,
      description: item.description
    });
    await doc.save();

    const id = doc.id;
    createdEntities[item.name] = id;

    // Sync node to CognoDB if live database
    await cognoService.createNode(id, item.type, item.name);
  }

  console.log(`Successfully seeded ${Object.keys(createdEntities).length} entities into MongoDB.`);

  // 4. Define Relationships Data
  const relationshipsToCreate: Array<{ from: string; to: string; type: RelationshipType }> = [
    // Project -> Feature
    { from: 'E-Commerce Platform', to: 'Checkout', type: 'HAS_FEATURE' },
    { from: 'E-Commerce Platform', to: 'Payment', type: 'HAS_FEATURE' },
    { from: 'E-Commerce Platform', to: 'Order Tracking', type: 'HAS_FEATURE' },
    { from: 'E-Commerce Platform', to: 'Notifications', type: 'HAS_FEATURE' },

    // Feature -> Service
    { from: 'Checkout', to: 'Order Service', type: 'IMPLEMENTED_BY' },
    { from: 'Payment', to: 'Payment Service', type: 'IMPLEMENTED_BY' },
    { from: 'Order Tracking', to: 'Shipping Service', type: 'IMPLEMENTED_BY' },
    { from: 'Notifications', to: 'Notification Service', type: 'IMPLEMENTED_BY' },

    // Service -> Service dependencies
    { from: 'Order Service', to: 'Payment Service', type: 'DEPENDS_ON' },
    { from: 'Shipping Service', to: 'Order Service', type: 'DEPENDS_ON' },
    { from: 'Notification Service', to: 'Payment Service', type: 'DEPENDS_ON' },

    // Service -> Developer owners
    { from: 'Payment Service', to: 'Alice', type: 'OWNED_BY' },
    { from: 'Order Service', to: 'Bob', type: 'OWNED_BY' }
  ];

  // 5. Create Relationships in CognoDB
  let relCount = 0;
  for (const rel of relationshipsToCreate) {
    const fromId = createdEntities[rel.from];
    const toId = createdEntities[rel.to];

    if (fromId && toId) {
      await cognoService.createRelationship(fromId, toId, rel.type);
      relCount++;
    } else {
      console.warn(`Could not seed relationship: ${rel.from} -> ${rel.to} because one or both IDs were missing.`);
    }
  }

  console.log(`Successfully seeded ${relCount} relationships into CognoDB.`);
  console.log('--- Seeding Completed ---');
}
