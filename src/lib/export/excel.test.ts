import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { generateRoundExcel, type RoundExportData } from './excel';

const createMockExportData = (): RoundExportData => ({
  round: {
    title: 'Test Runde 2025',
    submissionDeadline: new Date('2025-01-15'),
    ratingDeadline: new Date('2025-01-31'),
    fulfillmentDate: new Date('2025-12-31'),
  },
  prophecies: [
    {
      id: 'prophecy-1',
      title: 'Deutschland wird Weltmeister',
      description: 'Bei der naechsten WM',
      creatorUsername: 'testuser',
      creatorDisplayName: 'Test User',
      ratingCount: 5,
      averageRating: 3.5,
      fulfilled: null,
      createdAt: new Date('2025-01-10'),
    },
    {
      id: 'prophecy-2',
      title: 'Bitcoin erreicht 100k',
      description: 'Irgendwann dieses Jahr',
      creatorUsername: 'crypto_fan',
      creatorDisplayName: null,
      ratingCount: 8,
      averageRating: -2.3,
      fulfilled: true,
      createdAt: new Date('2025-01-11'),
    },
    {
      id: 'prophecy-3',
      title: 'Nicht erfuellte Prophezeiung',
      description: 'Das wird nicht passieren',
      creatorUsername: 'pessimist',
      creatorDisplayName: 'Der Pessimist',
      ratingCount: 3,
      averageRating: 7.0,
      fulfilled: false,
      createdAt: new Date('2025-01-12'),
    },
  ],
  ratings: [
    {
      prophecyTitle: 'Deutschland wird Weltmeister',
      raterUsername: 'user1',
      raterDisplayName: 'User Eins',
      value: 5,
      createdAt: new Date('2025-01-12'),
    },
    {
      prophecyTitle: 'Bitcoin erreicht 100k',
      raterUsername: 'user2',
      raterDisplayName: null,
      value: -3,
      createdAt: new Date('2025-01-13'),
    },
  ],
});

describe('generateRoundExcel', () => {
  it('generates a valid Excel buffer with two sheets', async () => {
    const data = createMockExportData();
    const buffer = await generateRoundExcel(data);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Verify it's a valid XLSX by reading it back
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets).toHaveLength(2);
    expect(workbook.worksheets[0].name).toBe('Prophezeiungen');
    expect(workbook.worksheets[1].name).toBe('Bewertungen');
  });

  it('includes correct prophecy headers in first sheet', async () => {
    const data = createMockExportData();
    const buffer = await generateRoundExcel(data);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet('Prophezeiungen')!;

    expect(sheet.getRow(1).getCell(1).value).toBe('Titel');
    expect(sheet.getRow(1).getCell(2).value).toBe('Beschreibung');
    expect(sheet.getRow(1).getCell(3).value).toBe('Ersteller');
    expect(sheet.getRow(1).getCell(4).value).toBe('Anzahl Bewertungen');
    expect(sheet.getRow(1).getCell(5).value).toBe('Durchschnitt');
    expect(sheet.getRow(1).getCell(6).value).toBe('Status');
    expect(sheet.getRow(1).getCell(7).value).toBe('Erstellt am');
  });

  it('includes correct prophecy data in first sheet', async () => {
    const data = createMockExportData();
    const buffer = await generateRoundExcel(data);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet('Prophezeiungen')!;

    // First data row (row 2)
    expect(sheet.getRow(2).getCell(1).value).toBe('Deutschland wird Weltmeister');
    expect(sheet.getRow(2).getCell(3).value).toBe('Test User'); // displayName preferred
    expect(sheet.getRow(2).getCell(4).value).toBe(5);
    expect(sheet.getRow(2).getCell(5).value).toBe(3.5);
    expect(sheet.getRow(2).getCell(6).value).toBe('Ausstehend');

    // Second row - user without displayName
    expect(sheet.getRow(3).getCell(3).value).toBe('crypto_fan'); // falls back to username
    expect(sheet.getRow(3).getCell(6).value).toBe('Erfuellt');

    // Third row - nicht erfuellt
    expect(sheet.getRow(4).getCell(6).value).toBe('Nicht erfuellt');
  });

  it('rounds averageRating to one decimal place', async () => {
    const data = createMockExportData();
    const buffer = await generateRoundExcel(data);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet('Prophezeiungen')!;

    // -2.3 should stay as -2.3
    expect(sheet.getRow(3).getCell(5).value).toBe(-2.3);
  });

  it('includes correct rating headers in second sheet', async () => {
    const data = createMockExportData();
    const buffer = await generateRoundExcel(data);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet('Bewertungen')!;

    expect(sheet.getRow(1).getCell(1).value).toBe('Prophezeiung');
    expect(sheet.getRow(1).getCell(2).value).toBe('Bewerter');
    expect(sheet.getRow(1).getCell(3).value).toBe('Bewertung');
    expect(sheet.getRow(1).getCell(4).value).toBe('Datum');
  });

  it('includes correct rating data in second sheet', async () => {
    const data = createMockExportData();
    const buffer = await generateRoundExcel(data);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet('Bewertungen')!;

    // First rating
    expect(sheet.getRow(2).getCell(1).value).toBe('Deutschland wird Weltmeister');
    expect(sheet.getRow(2).getCell(2).value).toBe('User Eins'); // displayName
    expect(sheet.getRow(2).getCell(3).value).toBe(5);

    // Second rating - user without displayName
    expect(sheet.getRow(3).getCell(2).value).toBe('user2'); // username fallback
    expect(sheet.getRow(3).getCell(3).value).toBe(-3);
  });

  it('handles empty prophecies gracefully', async () => {
    const data: RoundExportData = {
      round: {
        title: 'Leere Runde',
        submissionDeadline: new Date(),
        ratingDeadline: new Date(),
        fulfillmentDate: new Date(),
      },
      prophecies: [],
      ratings: [],
    };

    const buffer = await generateRoundExcel(data);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const propheciesSheet = workbook.getWorksheet('Prophezeiungen')!;
    const ratingsSheet = workbook.getWorksheet('Bewertungen')!;

    // Should only have header row
    expect(propheciesSheet.rowCount).toBe(1);
    expect(ratingsSheet.rowCount).toBe(1);
  });

  it('displays dash for null averageRating', async () => {
    const data: RoundExportData = {
      round: {
        title: 'Test',
        submissionDeadline: new Date(),
        ratingDeadline: new Date(),
        fulfillmentDate: new Date(),
      },
      prophecies: [
        {
          id: '1',
          title: 'Keine Bewertungen',
          description: '',
          creatorUsername: 'test',
          creatorDisplayName: null,
          ratingCount: 0,
          averageRating: null,
          fulfilled: null,
          createdAt: new Date(),
        },
      ],
      ratings: [],
    };

    const buffer = await generateRoundExcel(data);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet('Prophezeiungen')!;
    expect(sheet.getRow(2).getCell(5).value).toBe('-');
  });
});
