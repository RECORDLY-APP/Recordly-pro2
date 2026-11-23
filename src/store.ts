import { RecordItem, Person, Payment, DebtItem, DebtType, DebtRepayment } from './types';
import { getDebtStatusInfo, getLocalDateString } from './utils';

const STORAGE_KEY = 'recordly_data_v2';

function createSeedRecords(): RecordItem[] {
  return [
    {
      id: 'seed-record-1',
      title: 'Monthly Welfare & Dues',
      target: 15000,
      end_date: '2026-12-31',
      show_table: true,
      group_link: true,
      created_at: new Date().toISOString(),
      people: [
        {
          id: 'seed-p-1',
          record_id: 'seed-record-1',
          name: 'Amina Bello',
          phone: '08023456789',
          created_at: new Date().toISOString(),
          payments: [
            {
              id: 'seed-pay-1',
              person_id: 'seed-p-1',
              amount: 15000,
              paid_on: getLocalDateString(-2),
              note: 'Bank transfer',
              created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            },
          ],
        },
        {
          id: 'seed-p-2',
          record_id: 'seed-record-1',
          name: 'David Okafor',
          phone: '08098765432',
          created_at: new Date().toISOString(),
          payments: [
            {
              id: 'seed-pay-2',
              person_id: 'seed-p-2',
              amount: 10000,
              paid_on: getLocalDateString(-5),
              note: 'Part payment',
              created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
            },
          ],
        },
        {
          id: 'seed-p-3',
          record_id: 'seed-record-1',
          name: 'Chioma Adeyemi',
          phone: '08055512345',
          created_at: new Date().toISOString(),
          payments: [],
        },
      ],
    },
  ];
}

function createSeedDebts(): DebtItem[] {
  return [
    {
      id: 'seed-debt-1',
      type: 'receivable',
      person_name: 'Tunde Balogun',
      phone: '08034567890',
      original_amount: 35000,
      due_date: getLocalDateString(-3),
      notes: 'Balance for 2 cartons supplied',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      repayments: [
        {
          id: 'seed-rep-1',
          debt_id: 'seed-debt-1',
          amount: 10000,
          paid_on: getLocalDateString(-4),
          note: 'Initial transfer',
          created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        },
      ],
    },
    {
      id: 'seed-debt-2',
      type: 'payable',
      person_name: 'Kano Textile Supply',
      phone: '08077665544',
      original_amount: 48000,
      due_date: getLocalDateString(2),
      notes: 'Wholesale stock restock',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      repayments: [],
    },
    {
      id: 'seed-debt-3',
      type: 'receivable',
      person_name: 'Ngozi Okafor',
      phone: '08122334455',
      original_amount: 18000,
      due_date: getLocalDateString(-1),
      notes: 'Short-term shop float',
      created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
      repayments: [
        {
          id: 'seed-rep-2',
          debt_id: 'seed-debt-3',
          amount: 18000,
          paid_on: getLocalDateString(-1),
          note: 'Paid in full',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    },
  ];
}

class Store {
  private records: RecordItem[] = [];
  private debts: DebtItem[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Migrate legacy array format without losing existing records
          this.records = parsed;
          this.debts = createSeedDebts();
          this.save();
        } else if (parsed && typeof parsed === 'object') {
          this.records = Array.isArray(parsed.records) ? parsed.records : createSeedRecords();
          this.debts = Array.isArray(parsed.debts) ? parsed.debts : createSeedDebts();
        } else {
          this.records = createSeedRecords();
          this.debts = createSeedDebts();
          this.save();
        }
      } else {
        this.records = createSeedRecords();
        this.debts = createSeedDebts();
        this.save();
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using in-memory store', e);
      this.records = createSeedRecords();
      this.debts = createSeedDebts();
    }
  }

  private save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          records: this.records,
          debts: this.debts,
        })
      );
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error(err);
      }
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  public getRecords(): RecordItem[] {
    return [...this.records];
  }

  public getRecord(id: string): RecordItem | undefined {
    return this.records.find((r) => r.id === id);
  }

  public getPerson(personId: string): { person: Person; record: RecordItem } | undefined {
    for (const record of this.records) {
      const person = record.people.find((p) => p.id === personId);
      if (person) {
        return { person, record };
      }
    }
    return undefined;
  }

  public createRecord(
    title: string,
    target?: number | null,
    endDate?: string | null,
    initialPeople?: { name: string; phone?: string | null }[]
  ): RecordItem {
    const id = 'rec_' + Math.random().toString(36).slice(2, 10);
    const peopleList: Person[] = (initialPeople || []).map((p) => ({
      id: 'p_' + Math.random().toString(36).slice(2, 10),
      record_id: id,
      name: p.name.trim(),
      phone: p.phone ? p.phone.trim() : null,
      payments: [],
      created_at: new Date().toISOString(),
    }));

    const newRecord: RecordItem = {
      id,
      title: title.trim(),
      target: target ? Number(target) : null,
      end_date: endDate || null,
      show_table: true,
      group_link: true,
      created_at: new Date().toISOString(),
      people: peopleList,
    };

    this.records.unshift(newRecord);
    this.save();
    return newRecord;
  }

  public updateRecord(id: string, patch: Partial<RecordItem>) {
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.records[idx] = { ...this.records[idx], ...patch };
      this.save();
    }
  }

  public deleteRecord(id: string) {
    this.records = this.records.filter((r) => r.id !== id);
    this.save();
  }

  public addPerson(recordId: string, name: string, phone?: string | null): Person | undefined {
    const record = this.records.find((r) => r.id === recordId);
    if (!record) return undefined;
    const newPerson: Person = {
      id: 'p_' + Math.random().toString(36).slice(2, 10),
      record_id: recordId,
      name: name.trim(),
      phone: phone ? phone.trim() : null,
      payments: [],
      created_at: new Date().toISOString(),
    };
    record.people.push(newPerson);
    this.save();
    return newPerson;
  }

  public deletePerson(personId: string) {
    for (const r of this.records) {
      const idx = r.people.findIndex((p) => p.id === personId);
      if (idx !== -1) {
        r.people.splice(idx, 1);
        this.save();
        return;
      }
    }
  }

  public addPayment(personId: string, amount: number, paidOn?: string, note?: string | null): Payment | undefined {
    const found = this.getPerson(personId);
    if (!found) return undefined;
    const newPayment: Payment = {
      id: 'pay_' + Math.random().toString(36).slice(2, 10),
      person_id: personId,
      amount: Number(amount),
      paid_on: paidOn || getLocalDateString(0),
      note: note ? note.trim() : null,
      created_at: new Date().toISOString(),
    };
    found.person.payments.unshift(newPayment);
    this.save();
    return newPayment;
  }

  public deletePayment(paymentId: string) {
    for (const r of this.records) {
      for (const p of r.people) {
        const idx = p.payments.findIndex((pay) => pay.id === paymentId);
        if (idx !== -1) {
          p.payments.splice(idx, 1);
          this.save();
          return;
        }
      }
    }
  }

  // --- DEBT TRACKING (RECEIVABLES & PAYABLES) ---

  public getDebts(): DebtItem[] {
    return [...this.debts];
  }

  public getDebt(id: string): DebtItem | undefined {
    return this.debts.find((d) => d.id === id);
  }

  public createDebt(input: {
    type: DebtType;
    person_name: string;
    phone?: string | null;
    original_amount: number;
    due_date?: string | null;
    notes?: string | null;
  }): DebtItem {
    const newDebt: DebtItem = {
      id: 'debt_' + Math.random().toString(36).slice(2, 10),
      type: input.type,
      person_name: input.person_name.trim(),
      phone: input.phone ? input.phone.trim() : null,
      original_amount: Number(input.original_amount),
      due_date: input.due_date || null,
      notes: input.notes ? input.notes.trim() : null,
      repayments: [],
      created_at: new Date().toISOString(),
    };
    this.debts.unshift(newDebt);
    this.save();
    return newDebt;
  }

  public addDebtRepayment(
    debtId: string,
    amount: number,
    paidOn?: string,
    note?: string | null
  ): DebtRepayment | undefined {
    const debt = this.debts.find((d) => d.id === debtId);
    if (!debt) return undefined;
    const repayment: DebtRepayment = {
      id: 'rep_' + Math.random().toString(36).slice(2, 10),
      debt_id: debtId,
      amount: Number(amount),
      paid_on: paidOn || getLocalDateString(0),
      note: note ? note.trim() : null,
      created_at: new Date().toISOString(),
    };
    debt.repayments.unshift(repayment);
    this.save();
    return repayment;
  }

  public deleteDebt(debtId: string) {
    this.debts = this.debts.filter((d) => d.id !== debtId);
    this.save();
  }

  public getDebtStats() {
    let owedToMe = 0;
    let iOwe = 0;
    let overdueCount = 0;
    let dueSoonCount = 0;

    for (const d of this.debts) {
      const info = getDebtStatusInfo(d.original_amount, d.repayments, d.due_date);
      if (d.type === 'receivable') owedToMe += info.balance;
      else iOwe += info.balance;
      if (info.kind === 'overdue') overdueCount++;
      if (info.kind === 'due-soon') dueSoonCount++;
    }

    return {
      owedToMe,
      iOwe,
      overdueCount,
      dueSoonCount,
      totalCount: this.debts.length,
    };
  }

  public getOverallStats() {
    let totalCollected = 0;
    let peopleCount = 0;
    for (const r of this.records) {
      peopleCount += r.people.length;
      for (const p of r.people) {
        for (const pay of p.payments) {
          totalCollected += Number(pay.amount || 0);
        }
      }
    }
    return {
      totalCollected,
      recordCount: this.records.length,
      peopleCount,
    };
  }

  public clearAllData() {
    this.records = [];
    this.debts = [];
    this.save();
  }

  public resetToSample() {
    this.records = createSeedRecords();
    this.debts = createSeedDebts();
    this.save();
  }
}

export const store = new Store();
