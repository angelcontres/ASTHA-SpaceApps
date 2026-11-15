# ADR-016: Telemetría fisiológica con un registro diario

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RF-ING-01, RF-ING-03, RNF-POW-03, SRS §5.1 · RTM, CU-01

## Contexto
SRS §5.1 define una medición diaria por tripulante (180 días). La RTM y CU-01 hablan de ingesta continua a 1 Hz por BLE, lo que multiplica CPU, RAM y almacenamiento, y en el navegador exigiría Web Bluetooth.

## Decisión
Un registro fisiológico diario por tripulante, de entrada manual o del dataset sintético. Los escenarios del simulador inyectan registros puntuales, no flujos continuos.

## Consecuencias
- Unas 720 mediciones en 180 días: muy por debajo de 150 MB.
- Sin Web Bluetooth ni puente de sensores.
- Hay que corregir RF-ING-01 de la RTM y CU-01.
- La telemetría de hábitat queda fuera de esta decisión.

## Alternativas
1 Hz continuo; diario con flujo de 1 Hz solo en la demo; ingesta por eventos del sensor.
