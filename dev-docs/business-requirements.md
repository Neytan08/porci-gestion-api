# PorciGestión Business Requirements

## Purpose

This document summarizes the functional and business requirements gathered for PorciGestión. It serves as a reference for the expected behavior of the system and evolves as farm requirements are identified or refined.

The requirements describe the expected behavior from a business perspective rather than the technical implementation used to enforce it.

## Breeding Sows

### BR-SOW-001 --- Breeding Sow Registration

**Requirement**\
A new breeding sow can only be registered with `Vacía` or `No Productiva` status. Statuses such as `Gestación`, `Lactancia`, and `Retirada` are assigned by the corresponding reproductive or retirement processes.

**User Story**\
As a farm user, I want to register a new breeding sow with an appropriate initial status so that its reproductive lifecycle starts from a valid state.

### BR-SOW-002 --- Breeding Sow Identification

**Requirement**\
Each breeding sow must have a unique tag number and must be associated with an existing breed. Tag numbers are considered the same regardless of differences in letter casing or whitespace.

**User Story**\
As a farm user, I want each breeding sow to have a unique identification and a registered breed so that I can identify and manage animals correctly.

### BR-SOW-003 --- Reproductive Status Management

**Requirement**\
The breeding sow status must reflect its current reproductive stage. While a sow has an active mating or farrowing process, its status cannot be changed manually. Reproductive processes are responsible for moving the sow through `Gestación`, `Lactancia`, and back to `Vacía` when applicable.

**User Story**\
As a farm user, I want the sow status to follow its reproductive activity so that the system accurately represents the animal's current stage.

### BR-SOW-004 --- Breeding Sow Removal

**Requirement**\
A breeding sow without reproductive history can be permanently deleted.

Once a breeding sow has reproductive history, it must not be permanently deleted. Instead, it must be retired so that its historical information remains available.

When a sow is retired, it is marked as `Retirada` and is no longer considered an active breeding sow. Any active reproductive process must also be closed or cancelled as part of the retirement.

**User Story**\
As a farm user, I want to retire breeding sows without losing their reproductive history so that previous farm records remain available after the animal leaves production.

### BR-SOW-005 --- Retirement Date

**Requirement**\
The retirement date of a breeding sow cannot be earlier than its entry date. If the sow has an active farrowing that must be closed during retirement, the retirement date cannot be earlier than that farrowing date.

## Boars

### BR-BOAR-001 --- Boar Registration and Identification

**Requirement**\
Each boar must have a unique tag number and must be associated with an existing breed. Tag numbers are considered the same regardless of differences in letter casing or whitespace.

**User Story**\
As a farm user, I want each boar to have a unique identification and a registered breed so that I can reliably identify the animal throughout its reproductive history.

### BR-BOAR-002 --- Boar Retirement

**Requirement**\
A boar can be retired when it leaves active production. Retirement requires a removal date and a reason, and the removal date cannot be earlier than the boar's birth date.

Once retired, the boar is no longer considered active and cannot be modified, deleted, assigned to new mating events, or retired again.

**User Story**\
As a farm user, I want to retire a boar while preserving its existing information so that it is no longer used for reproduction without losing its historical records.

### BR-BOAR-003 --- Reproductive History Preservation

**Requirement**\
A boar without reproductive history can be permanently deleted.

Once a boar has been associated with a mating event, it must not be permanently deleted. It can instead be retired when it leaves active production so that its previous mating events remain part of the farm's reproductive history.

Retiring a boar does not remove or cancel mating events that were recorded while the boar was active.

## Breeds

### BR-BREED-001 --- Breed Registration

**Requirement**\
Each breed must have a unique name so that the same breed is not registered multiple times under equivalent names.

### BR-BREED-002 --- Breed Usage

**Requirement**\
A breed that is currently associated with one or more breeding sows or boars cannot be deleted. This preserves the breed information referenced by existing animal records.

**User Story**\
As a farm user, I want breed information used by registered animals to remain available so that existing animal records do not lose their breed association.

## Mating Events

### BR-MATING-001 --- Mating Eligibility

**Requirement**\
A new mating event can only be registered for an active breeding sow whose current status is `Vacía`.

A sow cannot start another mating process while it already has an active mating event with a `Pendiente` or `Positivo` pregnancy result.

**User Story**\
As a farm user, I want mating events to be registered only for eligible sows so that multiple active reproductive processes are not recorded for the same animal.

### BR-MATING-002 --- Reproduction Date

**Requirement**\
The reproduction date cannot be earlier than the sow's entry date.

After a sow completes weaning, at least 5 days must pass before a new mating event can be registered. Once this minimum period has passed, a new mating event can be registered whenever the sow is ready for reproduction.

**User Story**\
As a farm user, I want the system to prevent mating events from being registered too soon after weaning so that the sow has the minimum expected recovery period before starting another reproductive cycle.

### BR-MATING-003 --- Reproduction Method

**Requirement**\
A mating event can be registered as either `Monta Natural` or `Inseminación Artificial`.

`Monta Natural` requires an active boar to be associated with the mating event. `Inseminación Artificial` does not use a registered boar, so no boar can be associated with the event.

**User Story**\
As a farm user, I want the mating event to record the reproduction method and the corresponding boar when applicable so that the reproductive record accurately represents how the sow was bred.

### BR-MATING-004 --- Pregnancy Results

**Requirement**\
The pregnancy result of a mating event can be managed as `Pendiente`, `Positivo`, or `Negativo`.

The supported pregnancy result transitions are:

-   `Pendiente` → `Positivo`
-   `Pendiente` → `Negativo`
-   `Positivo` → `Negativo`

`Cancelado` and `Cerrado` are lifecycle results managed by other reproductive or retirement processes rather than manually assigned as pregnancy results.

**User Story**\
As a farm user, I want to update the pregnancy result as the sow's condition becomes known so that the reproductive record reflects the actual outcome.

### BR-MATING-005 --- Pregnancy Result and Sow Status

**Requirement**\
A positive pregnancy places the breeding sow in `Gestación`.

If a previously positive pregnancy changes to `Negativo`, the sow returns to `Vacía`. A mating event that changes directly from `Pendiente` to `Negativo` leaves the sow in `Vacía`.

These status changes are handled as part of the reproductive process rather than through a separate manual status change.

**User Story**\
As a farm user, I want pregnancy results to automatically update the sow's reproductive status so that I do not need to maintain the same information manually in multiple places.

### BR-MATING-006 --- Mating Event Removal

**Requirement**\
A mating event cannot be permanently deleted once a farrowing has been recorded from it because it forms part of the reproductive history associated with that farrowing.

When an eligible mating event with a positive pregnancy result is deleted before a farrowing exists, the associated sow returns to `Vacía`.

## Farrowings

### BR-FARROW-001 --- Farrowing Registration

**Requirement**\
A farrowing can only be registered for a breeding sow currently in `Gestación` with an active mating event whose pregnancy result is `Positivo`.

The farrowing date must be later than the reproduction date associated with that pregnancy.

**User Story**\
As a farm user, I want to register a farrowing only from a confirmed pregnancy so that every farrowing can be traced back to the reproductive event that produced it.

### BR-FARROW-002 --- Farrowing Information

**Requirement**\
A farrowing records the number of male piglets, female piglets, stillbirths, and mummies. These quantities cannot be negative, and stillbirths and mummies are considered zero when no value is provided.

The number of piglets recorded at weaning is not limited by the number of piglets originally born in that farrowing, since piglets may be transferred between breeding sows during lactation.

### BR-FARROW-003 --- Reproductive Lifecycle After Farrowing

**Requirement**\
When a farrowing is registered, the mating event associated with the pregnancy is considered completed and changes to `Cerrado`.

The breeding sow transitions from `Gestación` to `Lactancia`, and its accumulated farrowing count increases.

**User Story**\
As a farm user, I want a registered farrowing to complete the pregnancy and start the sow's lactation stage so that the system follows the reproductive lifecycle automatically.

### BR-FARROW-004 --- Weaning

**Requirement**\
An active farrowing can be completed through weaning while its breeding sow is in `Lactancia`.

The weaning date cannot be earlier than the farrowing date, and the number of weaned piglets is recorded as part of the process. A farrowing that has already been weaned cannot be weaned again.

When weaning is completed, the sow returns to `Vacía`, and the actual weaning date becomes its latest recorded weaning date.

**User Story**\
As a farm user, I want to record the completion of weaning so that the sow becomes available for its next reproductive cycle and its reproductive history remains accurate.

### BR-FARROW-005 --- Farrowing Removal

**Requirement**\
A completed farrowing that has already been weaned cannot be deleted.

An unweaned farrowing may be deleted while its reproductive workflow is still active. When this occurs, the system reverses the effects of the farrowing: the associated mating event returns to its previous active pregnancy state, the sow returns from `Lactancia` to `Gestación`, its farrowing count is corrected, and its previous weaning history is restored.

**User Story**\
As a farm user, I want to correct an incorrectly registered farrowing before the reproductive cycle is completed without leaving inconsistent reproductive information in the system.