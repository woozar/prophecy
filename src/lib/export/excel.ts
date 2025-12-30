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
  prophecyId: string;
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

const dateTimeFormat = 'DD.MM.YYYY HH:mm';

export async function generateRoundExcel(data: RoundExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Prophezeiung App';
  workbook.created = new Date();

  // Sheet 1: Prophezeiungen
  const propheciesSheet = workbook.addWorksheet('Prophezeiungen');

  propheciesSheet.columns = [
    { header: 'ID', key: 'id', width: 28 },
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

  // Set date format for createdAt column
  propheciesSheet.getColumn('createdAt').numFmt = dateTimeFormat;

  // Add prophecy data
  data.prophecies.forEach((prophecy) => {
    let statusText: string;
    if (prophecy.fulfilled === true) {
      statusText = 'Erfuellt';
    } else if (prophecy.fulfilled === false) {
      statusText = 'Nicht erfuellt';
    } else {
      statusText = 'Ausstehend';
    }

    const averageRating =
      prophecy.averageRating === null ? '-' : Math.round(prophecy.averageRating * 10) / 10;

    propheciesSheet.addRow({
      id: prophecy.id,
      title: prophecy.title,
      description: prophecy.description,
      creator: prophecy.creatorDisplayName || prophecy.creatorUsername,
      ratingCount: prophecy.ratingCount,
      averageRating,
      status: statusText,
      createdAt: prophecy.createdAt,
    });
  });

  // Sheet 2: Bewertungen
  const ratingsSheet = workbook.addWorksheet('Bewertungen');

  ratingsSheet.columns = [
    { header: 'Prophezeiung ID', key: 'prophecyId', width: 28 },
    { header: 'Prophezeiung', key: 'prophecyTitle', width: 40 },
    { header: 'Bewerter', key: 'rater', width: 20 },
    { header: 'Bewertung', key: 'value', width: 12 },
    { header: 'Datum', key: 'createdAt', width: 20 },
  ];

  // Style header row
  ratingsSheet.getRow(1).eachCell((cell) => {
    Object.assign(cell, { style: headerStyle });
  });
  ratingsSheet.getRow(1).height = 25;

  // Set date format for createdAt column
  ratingsSheet.getColumn('createdAt').numFmt = dateTimeFormat;

  // Add rating data
  data.ratings.forEach((rating) => {
    ratingsSheet.addRow({
      prophecyId: rating.prophecyId,
      prophecyTitle: rating.prophecyTitle,
      rater: rating.raterDisplayName || rating.raterUsername,
      value: rating.value,
      createdAt: rating.createdAt,
    });
  });

  // Generate buffer
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
