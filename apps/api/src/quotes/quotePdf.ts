import PDFDocument from "pdfkit";

import type { QuoteVersionWithRelations } from "./quoteService.js";

export async function renderQuotePdf(version: QuoteVersionWithRelations): Promise<Buffer> {
  const doc = new PDFDocument({
    compress: false,
    margin: 36,
    size: "A4",
  });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
  });

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  writePdfContent(doc, version);
  doc.end();

  return done;
}

function writePdfContent(doc: PDFKit.PDFDocument, version: QuoteVersionWithRelations): void {
  doc.fontSize(18).text(version.workshopTradeName, { align: "center" });
  if (version.workshopLegalName) {
    doc.fontSize(10).text(version.workshopLegalName, { align: "center" });
  }
  if (version.workshopDocument) {
    doc.fontSize(10).text(`Documento: ${version.workshopDocument}`, { align: "center" });
  }

  doc.moveDown();
  doc.fontSize(14).text(`Orcamento ${version.versionNumber}`, { underline: true });
  doc.fontSize(10).text(`Validade: ${formatDate(version.validUntil)}`);
  if (version.estimatedDeliveryAt) {
    doc.text(`Previsao de entrega: ${formatDate(version.estimatedDeliveryAt)}`);
  }

  doc.moveDown();
  doc.fontSize(12).text("Cliente");
  doc.fontSize(10).text(version.customerName);
  if (version.customerDocument) {
    doc.text(`Documento: ${version.customerDocument}`);
  }
  if (version.customerPhone) {
    doc.text(`Telefone: ${version.customerPhone}`);
  }

  doc.moveDown();
  doc.fontSize(12).text("Veiculo");
  doc.fontSize(10).text(version.vehicleLabel);
  if (version.vehiclePlate) {
    doc.text(`Placa: ${version.vehiclePlate}`);
  }

  writeDiagnosis(doc, version);
  writeItems(
    doc,
    "Servicos",
    version.items.filter((item) => item.kind === "service"),
  );
  writeItems(
    doc,
    "Produtos",
    version.items.filter((item) => item.kind === "product"),
  );

  doc.moveDown();
  doc.fontSize(12).text("Totais");
  doc.fontSize(10).text(`Subtotal: R$ ${version.subtotalAmount.toFixed(2)}`);
  doc.text(`Descontos: R$ ${version.discountAmount.toFixed(2)}`);
  doc.text(`Acrescimos: R$ ${version.surchargeAmount.toFixed(2)}`);
  doc.fontSize(12).text(`Total: R$ ${version.totalAmount.toFixed(2)}`);

  if (version.customerNotes) {
    doc.moveDown();
    doc.fontSize(12).text("Observacoes");
    doc.fontSize(10).text(version.customerNotes);
  }
}

function writeDiagnosis(doc: PDFKit.PDFDocument, version: QuoteVersionWithRelations): void {
  if (!version.diagnosisProblema && !version.diagnosisCausa && !version.diagnosisRecomendacao) {
    return;
  }

  doc.moveDown();
  doc.fontSize(12).text("Diagnostico");
  if (version.diagnosisProblema) {
    doc.fontSize(10).text(`Problema: ${version.diagnosisProblema}`);
  }
  if (version.diagnosisCausa) {
    doc.text(`Causa: ${version.diagnosisCausa}`);
  }
  if (version.diagnosisRecomendacao) {
    doc.text(`Recomendacao: ${version.diagnosisRecomendacao}`);
  }
}

function writeItems(
  doc: PDFKit.PDFDocument,
  title: string,
  items: QuoteVersionWithRelations["items"],
): void {
  if (items.length === 0) {
    return;
  }

  doc.moveDown();
  doc.fontSize(12).text(title);
  for (const item of items) {
    doc
      .fontSize(10)
      .text(
        `${item.description} - ${item.quantity.toFixed(3)} x R$ ${item.unitPrice.toFixed(2)} = R$ ${item.totalAmount.toFixed(2)}`,
      );
  }
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(value);
}
