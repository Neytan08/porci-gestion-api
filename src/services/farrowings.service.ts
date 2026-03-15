// import prisma from "../prismaClient";

// class FarrowingsService {
//     async getAll() {
//         return await prisma.farrowings.findMany({
//             include: { breedingsows: true },
//         });
//     }

//     async getById(id: number) {
//         return await prisma.farrowings.findUnique({
//             where: { farrowing_id: id },
//             include: { breedingsows: true },
//         });
//     }

//     async create(data: any) {
//         return await prisma.farrowings.create({
//             data,
//         });
//     }

//     async update(id: number, data: any) {
//         return await prisma.farrowings.update({
//             where: { farrowing_id: id },
//             data,
//         });
//     }

//     async delete(id: number) {
//         return await prisma.farrowings.delete({
//             where: { farrowing_id: id },
//         });
//     }

//     async getAllFarrowingsBySow(sowId: number) {
//         return await prisma.farrowings.findMany({
//             where: { sow_id: sowId },
//             // include: { breedingsows: true }, // optional, if you want to include breeding sow details
//         });
//     }
// }

// export default new FarrowingsService();
