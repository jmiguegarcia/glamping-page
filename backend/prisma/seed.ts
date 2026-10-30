// Datos iniciales del catálogo. Ejecutar con: npx prisma db seed
// Usa upsert, así que se puede ejecutar varias veces sin duplicar nada.
//
// Tarifas de la cabaña: precios reales (oct-2026).
// ⚠️ Precios de servicios: DE EJEMPLO — reemplazar por los reales.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, TipoTarifa } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const cabana = {
  slug: 'cabana-primavera',
  nombre: 'Cabaña Primavera',
  descripcion: 'Cabaña rústica y cálida para dos personas, rodeada de naturaleza.',
  capacidad: 2,
};

const tarifasCabana: Record<TipoTarifa, number> = {
  NOCHE_ENTRE_SEMANA: 320_000,
  NOCHE_FIN_DE_SEMANA: 450_000,
  DIA_DE_SOL: 250_000,
  OCASIONAL: 120_000,
};

const servicios = [
  {
    slug: 'desayuno',
    nombre: 'Desayuno',
    descripcion: 'Desayuno típico servido en la cabaña.',
    precio: 40_000, // ejemplo
  },
  {
    slug: 'cena-romantica',
    nombre: 'Cena romántica',
    descripcion: 'Cena para dos con velas y ambientación especial.',
    precio: 150_000, // ejemplo
  },
  {
    slug: 'decoracion',
    nombre: 'Decoración',
    descripcion: 'Decoración especial para aniversarios, cumpleaños o pedidas de mano.',
    precio: 80_000, // ejemplo
  },
  {
    slug: 'jacuzzi',
    nombre: 'Jacuzzi',
    descripcion: 'Jacuzzi privado con agua caliente.',
    precio: 100_000, // ejemplo
  },
];

async function main() {
  const { id: alojamientoId } = await prisma.alojamiento.upsert({
    where: { slug: cabana.slug },
    update: cabana,
    create: cabana,
  });

  for (const [tipo, precio] of Object.entries(tarifasCabana) as [TipoTarifa, number][]) {
    await prisma.tarifa.upsert({
      where: { alojamientoId_tipo: { alojamientoId, tipo } },
      update: { precio },
      create: { alojamientoId, tipo, precio },
    });
  }

  for (const s of servicios) {
    await prisma.servicio.upsert({ where: { slug: s.slug }, update: s, create: s });
  }

  console.log(`Seed listo: 1 alojamiento, ${Object.keys(tarifasCabana).length} tarifas, ${servicios.length} servicios.`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
