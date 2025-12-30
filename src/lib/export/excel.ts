import ExcelJS from 'exceljs';

export interface ProphecyExportData {
  id: string;
  title: string;
  description: string;
  creatorUsername: string;
  creatorDisplayName: string | null;
  ratingCount: number;
  averageRating: number | null;
  fulfilled: boolean | null;
  createdAt: Date;
}

export interface RatingExportData {
  prophecyTitle: string;
  raterUsername: string;
  raterDisplayName: string | null;
  value: number;
  createdAt: Date;
}

export interface RoundExportData {
  round: {
    title: string;
    submissionDeadline: Date;
    ratingDeadline: Date;
    fulfillmentDate: Date;
  };
  prophecies: ProphecyExportData[];
  ratings: RatingExportData[];
}

const headerStyle: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF102A43' } },
  alignment: { horizontal: 'center', vertical: 'middle' },
};

export async function generateRoundExcel(data: RoundExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Prophezeiung App';
  workbook.created = new Date();

  // Sheet 1: Prophezeiungen
  const propheciesSheet = workbook.addWorksheet('Prophezeiungen');

  propheciesSheet.columns = [
    { header: 'Titel', key: 'title', width: 40 },
    { header: 'Beschreibung', key: 'description', width: 60 },
    { header: 'Ersteller', key: 'creator', width: 20 },
    { header: 'Anzahl Bewertungen', key: 'ratingCount', width: 18 },
    { header: 'Durchschnitt', key: 'averageRating', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Erstellt am', key: 'createdAt', width: 18 },
  ];

  // Style header row
  propheciesSheet.getRow(1).eachCell((cell) => {
    Object.assign(cell, { style: headerStyle });
  });
  propheciesSheet.getRow(1).height = 25;

  // Add prophecy data
  data.prophecies.forEach((prophecy) => {
    const statusText =
      prophecy.fulfilled === true
        ? 'Erfuellt'
        : prophecy.fulfilled === false
          ? 'Nicht erfuellt'
          : 'Ausstehend';

    propheciesSheet.addRow({
      title: prophecy.title,
      description: prophecy.description,
      creator: prophecy.creatorDisplayName || prophecy.creatorUsername,
      ratingCount: prophecy.ratingCount,
      averageRating:
        prophecy.averageRating !== null ? Math.round(prophecy.averageRating * 10) / 10 : '-',
      status: statusText,
      createdAt: prophecy.createdAt,
    });
  });

  // Sheet 2: Bewertungen
  const ratingsSheet = workbook.addWorksheet('Bewertungen');

  ratingsSheet.columns = [
    { header: 'Prophezeiung', key: 'prophecyTitle', width: 40 },
    { header: 'Bewerter', key: 'rater', width: 20 },
    { header: 'Bewertung', key: 'value', width: 12 },
    { header: 'Datum', key: 'createdAt', width: 18 },
  ];

  // Style header row
  ratingsSheet.getRow(1).eachCell((cell) => {
    Object.assign(cell, { style: headerStyle });
  });
  ratingsSheet.getRow(1).height = 25;

  // Add rating data
  data.ratings.forEach((rating) => {
    ratingsSheet.addRow({
      prophecyTitle: rating.prophecyTitle,
      rater: rating.raterDisplayName || rating.raterUsername,
      value: rating.value,
      createdAt: rating.createdAt,
    });
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
