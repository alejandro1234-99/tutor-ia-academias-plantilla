import ExcelJS from "exceljs";
import { conSesion, obtenerSesion } from "@/servidor/sesion";

// La plantilla de la lista de alumnos (Excel con Nombre, Correo y Grupo).
export async function GET() {
  const s = await obtenerSesion();
  if (!s || (!s.papeles.includes("formador") && !s.papeles.includes("dueno"))) return new Response("No encontrado", { status: 404 });
  const grupos = await conSesion(s, (tx) => tx`select nombre from grupos where not archivado and (academia.soy_dueno() or id = any(academia.mis_grupos())) order by nombre limit 1`);
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Alumnos");
  hoja.columns = [
    { header: "Nombre", key: "nombre", width: 32 },
    { header: "Correo", key: "correo", width: 34 },
    { header: "Grupo", key: "grupo", width: 18 },
  ];
  hoja.getRow(1).font = { bold: true };
  hoja.addRow({ nombre: "Nombre Apellido Apellido", correo: "alumno@correo.es", grupo: (grupos[0]?.nombre as string) ?? "Grupo" });
  const buffer = await libro.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-alumnos.xlsx"',
    },
  });
}
