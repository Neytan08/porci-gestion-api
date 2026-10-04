# PorciGestión API

Backend service for **PorciGestión**, a mobile application being developed to solve a real world farming problem: tracking breeding sows and their reproductive lifecycle.

## Overview

PorciGestión centralizes reproductive records and the business rules that determine how each sow moves through reproduction, pregnancy, farrowing, and weaning.

The API is responsible for validating these workflows, maintaining consistent data, and providing the REST interface consumed by the mobile application.

## Architecture

The backend separates HTTP handling, business workflows, domain rules, and persistence responsibilities.

`Route → asyncHandler → Controller → Service → Command → Rules / Queries / Errors → Prisma`

This structure keeps domain decisions outside controllers and database access isolated from business rules.

## Core Workflows

- Breeding sow and boar management
- Reproduction tracking
- Pregnancy results
- Farrowing and weaning
- Sow status transitions
- Farm reference data

## Engineering Highlights

- Request validation with Zod
- Centralized error handling
- Structured logging with request level tracing
- Request context propagation with AsyncLocalStorage
- OpenAPI and Swagger documentation
- PostgreSQL persistence through Prisma
- Domain rules separated from HTTP and persistence concerns

## Tech Stack

**TypeScript · Node.js · Express · PostgreSQL · Prisma · Zod · Winston · OpenAPI**

## Status

Under active development. The core backend is approaching a functional MVP.

Authentication and security hardening are still pending. Automated testing, CI, Docker, and continuous delivery are planned as the next engineering stages.

## Portfolio Note

This repository is public to present the engineering work behind PorciGestión. It is not intended as an installation ready distribution, so setup and deployment instructions are intentionally omitted.

## Mobile Application

The mobile client is maintained in a separate repository.

[View PorciGestión Frontend](https://github.com/Neytan08/porci-gestion-frontend)
