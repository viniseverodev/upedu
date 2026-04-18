-- Migration: adiciona MANHA e TARDE ao enum Turno (additive, não quebra dados existentes)
ALTER TYPE "Turno" ADD VALUE IF NOT EXISTS 'MANHA';
ALTER TYPE "Turno" ADD VALUE IF NOT EXISTS 'TARDE';
