import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { FARROWING_ERROR_CODES as codes } from "../../../src/services/farrowings/farrowingErrors";
import { PREGNANCY_RESULTS as results } from "../../../src/services/matingEvents/pregnancyRules";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { createFarrowing } from "../../helpers/farrowings";
import { matingPayload } from "../../helpers/matingEvents";

const base = "/api/farrowings";

describe("farrowing weaning", () => {
  it("records actual weaning and returns the sow to empty while preserving pregnancy and planned history", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.findUniqueOrThrow({
      where: { sow_id: farrowing.sow_id },
    });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    const response = await api
      .patch(`${base}/${farrowing.farrowing_id}/wean`)
      .send({ weaned_date: "2024-06-01", weaned_piglets: 8 });
    expect(response.status).toBe(200);
    const saved = await prisma.farrowings.findFirstOrThrow();
    expect(response.body).toEqual(JSON.parse(JSON.stringify(saved)));
    expect(saved).toEqual({ ...farrowing, weaned_date: new Date("2024-06-01"), weaned_piglets: 8 });
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, status: statuses.vacia, last_weaning_date: new Date("2024-06-01") },
    ]);
    expect(await prisma.matingevents.findMany()).toEqual([mating]);
  });

  it("accepts zero weaned piglets on the farrowing calendar day", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.findUniqueOrThrow({
      where: { sow_id: farrowing.sow_id },
    });
    const response = await api
      .patch(`${base}/${farrowing.farrowing_id}/wean`)
      .send({ weaned_date: "2024-05-01", weaned_piglets: 0 });
    expect(response.status).toBe(200);
    expect(await prisma.farrowings.findMany()).toEqual([
      { ...farrowing, weaned_date: farrowing.farrowing_date, weaned_piglets: 0 },
    ]);
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, status: statuses.vacia, last_weaning_date: farrowing.farrowing_date },
    ]);
  });

  it("allows transferred piglets to make the weaned count exceed live births", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    expect(farrowing.live_births).toBe(9);
    const response = await api
      .patch(`${base}/${farrowing.farrowing_id}/wean`)
      .send({ weaned_date: "2024-06-01", weaned_piglets: 12 });
    expect(response.status).toBe(200);
    expect(await prisma.farrowings.findMany()).toEqual([
      { ...farrowing, weaned_date: new Date("2024-06-01"), weaned_piglets: 12 },
    ]);
    expect(
      await prisma.breedingsows.findUnique({ where: { sow_id: farrowing.sow_id } }),
    ).toMatchObject({
      status: statuses.vacia,
      last_weaning_date: new Date("2024-06-01"),
      farrowing_number: 1,
    });
  });

  it("rejects actual weaning before farrowing without changing reproductive state", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.findUniqueOrThrow({
      where: { sow_id: farrowing.sow_id },
    });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    expectApiError(
      await api
        .patch(`${base}/${farrowing.farrowing_id}/wean`)
        .send({ weaned_date: "2024-04-30", weaned_piglets: 8 }),
      400,
      codes.FARROWING_WEAN_DATE_INVALID,
    );
    expect(await prisma.farrowings.findMany()).toEqual([farrowing]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.matingevents.findMany()).toEqual([mating]);
  });

  it("rejects repeated weaning even when the first completion recorded zero piglets", async () => {
    const fixture = await createFarrowing((await createBoar()).boar_id);
    expect(
      (
        await api
          .patch(`${base}/${fixture.farrowing_id}/wean`)
          .send({ weaned_date: "2024-06-01", weaned_piglets: 0 })
      ).status,
    ).toBe(200);
    const farrowing = await prisma.farrowings.findFirstOrThrow();
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: fixture.sow_id } });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: fixture.mating_id },
    });
    expectApiError(
      await api
        .patch(`${base}/${fixture.farrowing_id}/wean`)
        .send({ weaned_date: "2024-06-02", weaned_piglets: 8 }),
      409,
      codes.FARROWING_ALREADY_WEANED,
    );
    expect(await prisma.farrowings.findMany()).toEqual([farrowing]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.matingevents.findMany()).toEqual([mating]);
  });

  it("rejects non-lactating and retired sows without completing their farrowing", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    for (const status of [
      statuses.vacia,
      statuses.gestacion,
      statuses.noProductiva,
      statuses.retirada,
    ]) {
      const sow = await prisma.breedingsows.update({
        where: { sow_id: farrowing.sow_id },
        data: {
          status,
          removal_date: status === statuses.retirada ? new Date("2024-06-15") : null,
        },
      });
      expectApiError(
        await api
          .patch(`${base}/${farrowing.farrowing_id}/wean`)
          .send({ weaned_date: "2024-06-01", weaned_piglets: 8 }),
        409,
        codes.SOW_NOT_LACTATING,
      );
      expect(await prisma.farrowings.findMany()).toEqual([farrowing]);
      expect(await prisma.breedingsows.findMany()).toEqual([sow]);
      expect(await prisma.matingevents.findMany()).toEqual([mating]);
    }
  });
});

describe("farrowing deletion and history restoration", () => {
  it("restores pregnancy, gestation and the accumulated count while preserving unrelated history", async () => {
    const boar = await createBoar();
    const target = await createFarrowing(boar.boar_id);
    const survivor = await createFarrowing(boar.boar_id);
    await prisma.breedingsows.update({
      where: { sow_id: target.sow_id },
      data: { farrowing_number: 5 },
    });
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    const matings = await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } });
    const response = await api.delete(`${base}/${target.farrowing_id}`);
    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(await prisma.farrowings.findMany()).toEqual([survivor]);
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual(
      matings.map((mating) =>
        mating.mating_id === target.mating_id
          ? { ...mating, pregnancy_result: results.positivo }
          : mating,
      ),
    );
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(
      sows.map((sow) =>
        sow.sow_id === target.sow_id
          ? { ...sow, status: statuses.gestacion, farrowing_number: 4 }
          : sow,
      ),
    );
    expect(await prisma.boars.findMany()).toEqual([boar]);
  });

  it("clears a sow-only weaning date when no completed historical farrowing exists", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.update({
      where: { sow_id: farrowing.sow_id },
      data: { last_weaning_date: new Date("2023-06-01") },
    });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    expect((await api.delete(`${base}/${farrowing.farrowing_id}`)).status).toBe(204);
    expect(await prisma.farrowings.count()).toBe(0);
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, status: statuses.gestacion, farrowing_number: 0, last_weaning_date: null },
    ]);
    expect(await prisma.matingevents.findMany()).toEqual([
      { ...mating, pregnancy_result: results.positivo },
    ]);
  });

  it("restores the most recent completed weaning for the same sow rather than stored date or record order", async () => {
    const boar = await createBoar();
    const target = await createFarrowing(boar.boar_id);
    // Create the latest completion first so identifier order cannot substitute for date order.
    for (const history of [
      { reproductionDate: "2023-06-06", farrowingDate: "2023-10-01", weanedDate: "2023-11-01" },
      { reproductionDate: "2023-01-01", farrowingDate: "2023-05-01", weanedDate: "2023-06-01" },
    ]) {
      const mating = await prisma.matingevents.create({
        data: {
          ...matingPayload(target.sow_id, boar.boar_id),
          reproduction_date: new Date(history.reproductionDate),
          pregnancy_result: results.cerrado,
        },
      });
      await prisma.farrowings.create({
        data: {
          sow_id: target.sow_id,
          mating_id: mating.mating_id,
          farrowing_date: new Date(history.farrowingDate),
          male_piglets: 5,
          female_piglets: 4,
          weaned_date: new Date(history.weanedDate),
          weaned_piglets: 8,
        },
      });
    }
    const unrelated = await createFarrowing(boar.boar_id);
    await prisma.farrowings.update({
      where: { farrowing_id: unrelated.farrowing_id },
      data: { weaned_date: new Date("2024-06-01"), weaned_piglets: 8 },
    });
    await prisma.breedingsows.update({
      where: { sow_id: unrelated.sow_id },
      data: { status: statuses.vacia, last_weaning_date: new Date("2024-06-01") },
    });
    await prisma.breedingsows.update({
      where: { sow_id: target.sow_id },
      data: { farrowing_number: 3, last_weaning_date: new Date("2023-03-01") },
    });
    const farrowings = await prisma.farrowings.findMany({ orderBy: { farrowing_id: "asc" } });
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    const matings = await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } });
    expect((await api.delete(`${base}/${target.farrowing_id}`)).status).toBe(204);
    expect(await prisma.farrowings.findMany({ orderBy: { farrowing_id: "asc" } })).toEqual(
      farrowings.filter(({ farrowing_id }) => farrowing_id !== target.farrowing_id),
    );
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(
      sows.map((sow) =>
        sow.sow_id === target.sow_id
          ? {
              ...sow,
              status: statuses.gestacion,
              farrowing_number: 2,
              last_weaning_date: new Date("2023-11-01"),
            }
          : sow,
      ),
    );
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual(
      matings.map((mating) =>
        mating.mating_id === target.mating_id
          ? { ...mating, pregnancy_result: results.positivo }
          : mating,
      ),
    );
  });

  it("preserves completed history including zero-piglet and retirement closures", async () => {
    const boar = await createBoar();
    for (const completion of ["wean", "zero", "retire"] as const) {
      const fixture = await createFarrowing(boar.boar_id);
      const response =
        completion === "retire"
          ? await api.patch("/api/breedingsows/retire").send({
              sow_ids: fixture.sow_id,
              removal_date: "2024-06-15",
              removal_reason: "End of production",
            })
          : await api
              .patch(`${base}/${fixture.farrowing_id}/wean`)
              .send({ weaned_date: "2024-06-01", weaned_piglets: completion === "zero" ? 0 : 8 });
      expect(response.status).toBe(200);
      const farrowings = await prisma.farrowings.findMany({ orderBy: { farrowing_id: "asc" } });
      const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
      const matings = await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } });
      expectApiError(
        await api.delete(`${base}/${fixture.farrowing_id}`),
        409,
        codes.FARROWING_COMPLETED_DELETE_FORBIDDEN,
      );
      expect(await prisma.farrowings.findMany({ orderBy: { farrowing_id: "asc" } })).toEqual(
        farrowings,
      );
      expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(sows);
      expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual(
        matings,
      );
    }
  });

  it("rejects deletion when sow or mating lifecycle state no longer matches the open farrowing", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    for (const state of [
      { status: statuses.gestacion, result: results.cerrado },
      { status: statuses.retirada, result: results.cerrado },
      { status: statuses.lactancia, result: results.positivo },
      { status: statuses.lactancia, result: results.cancelado },
    ]) {
      const sow = await prisma.breedingsows.update({
        where: { sow_id: farrowing.sow_id },
        data: { status: state.status },
      });
      const mating = await prisma.matingevents.update({
        where: { mating_id: farrowing.mating_id },
        data: { pregnancy_result: state.result },
      });
      expectApiError(
        await api.delete(`${base}/${farrowing.farrowing_id}`),
        409,
        codes.FARROWING_STATE_CHANGED,
      );
      expect(await prisma.farrowings.findMany()).toEqual([farrowing]);
      expect(await prisma.breedingsows.findMany()).toEqual([sow]);
      expect(await prisma.matingevents.findMany()).toEqual([mating]);
    }
  });

  it("rolls back deletion and pregnancy restoration when the sow counter cannot be decremented", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.update({
      where: { sow_id: farrowing.sow_id },
      data: { farrowing_number: 0 },
    });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    expectApiError(
      await api.delete(`${base}/${farrowing.farrowing_id}`),
      409,
      codes.FARROWING_STATE_CHANGED,
    );
    expect(await prisma.farrowings.findMany()).toEqual([farrowing]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.matingevents.findMany()).toEqual([mating]);
  });
});
