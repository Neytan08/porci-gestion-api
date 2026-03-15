import prisma from "../prismaClient";

class MatingEventsService {
  async getAll() {
    return await prisma.matingevents.findMany();
  }

  async getById(id: number) {
    return await prisma.matingevents.findUnique({
      where: { mating_id: id },
    });
  }

  async create(data: any) {
    return await prisma.matingevents.create({
      data,
    });
  }

  async update(id: number, data: any) {
    return await prisma.matingevents.update({
      where: { mating_id: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.matingevents.delete({
      where: { mating_id: id },
    });
  }

  async getAllMatingEventsBySow(sowId: number) {
    return await prisma.matingevents.findMany({
      where: { sow_id: sowId },
    });
  }

  async getAllMatingEventsByBoar(boarId: number) {
    return await prisma.matingevents.findMany({
      where: { boar_id: boarId },
    });
  }

  async getAllGroupedByPregnancyResult() {
    // Fetch all mating events ordered by pregnancy_result
    const events = await prisma.matingevents.findMany({
      orderBy: { pregnancy_result: "asc" },
      include: {
        breedingsows: { select: { sow_tag_number: true } },
      },
    });
    // Group events by pregnancy_result
    const map = new Map<string | null, typeof events>();
    for (const ev of events) {
      const key = ev.pregnancy_result ?? null;
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    // Convert map to desired array format
    return Array.from(map, ([pregnancy_result, events]) => ({
      pregnancy_result,
      events,
    }));
  }
}

export default new MatingEventsService();
