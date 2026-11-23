import { store } from './store';
import { DebtType } from './types';
import {
  formatNaira,
  escapeHtml,
  toast,
  copyToClipboard,
  getShareUrl,
  getDebtStatusInfo,
  getLocalDateString,
} from './utils';
import { renderStepByStepGuideModal } from './guide';

export function openLogPaymentModal(defaultRecordId?: string, defaultPersonId?: string) {
  const modalRootEl = document.getElementById('modalRoot');
  if (!modalRootEl) return;
  const modalRoot: HTMLElement = modalRootEl;

  const records = store.getRecords();
  if (records.length === 0) {
    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 border border-slate-100 text-center animate-slide-up">
          <div class="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-1">No records found yet</h3>
          <p class="text-xs text-slate-600 mb-4 leading-relaxed">
            To log a payment, you need a record first. Follow our step-by-step guide to create your first record in 1 minute.
          </p>
          <div class="flex flex-col gap-2">
            <button id="modalStartGuide" class="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors">
              Start step-by-step guide
            </button>
            <button id="modalCloseEmpty" class="w-full py-2 px-4 text-slate-500 font-semibold text-xs rounded-xl hover:bg-slate-100 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    modalRoot.querySelector('#modalCloseEmpty')?.addEventListener('click', () => {
      modalRoot.innerHTML = '';
    });
    modalRoot.querySelector('#modalStartGuide')?.addEventListener('click', () => {
      modalRoot.innerHTML = '';
      renderStepByStepGuideModal(modalRoot, () => {
        modalRoot.innerHTML = '';
      });
    });
    return;
  }

  // Pre-selected record & person
  let selectedRecordId = defaultRecordId || records[0].id;
  let currentRec = store.getRecord(selectedRecordId) || records[0];
  let selectedPersonId = defaultPersonId || (currentRec.people[0]?.id ?? '');

  function renderForm() {
    currentRec = store.getRecord(selectedRecordId) || records[0];
    const people = currentRec.people || [];

    if (!selectedPersonId && people.length > 0) {
      selectedPersonId = people[0].id;
    }

    const selectedPerson = people.find((p) => p.id === selectedPersonId);
    const paidSoFar = selectedPerson
      ? selectedPerson.payments.reduce((a, b) => a + Number(b.amount || 0), 0)
      : 0;
    const target = Number(currentRec.target || 0);
    const remaining = target > paidSoFar ? target - paidSoFar : 0;

    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[92vh] overflow-hidden animate-slide-up border border-slate-100">
          
          <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-emerald-700">Quick Entry</span>
              <h2 class="text-base font-bold text-slate-900">Log a payment</h2>
            </div>
            <button id="closePayModal" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="p-5 overflow-y-auto space-y-4 text-sm">
            
            <!-- Record Selection -->
            <div>
              <label for="payRecordSelect" class="block text-xs font-bold text-slate-700 mb-1">
                Choose record <span class="text-emerald-700">*</span>
              </label>
              <select id="payRecordSelect" class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
                ${records
                  .map(
                    (r) =>
                      `<option value="${r.id}" ${r.id === selectedRecordId ? 'selected' : ''}>${escapeHtml(r.title)} (${r.people.length} people)</option>`
                  )
                  .join('')}
              </select>
              <p class="text-xs text-slate-500 mt-1">Short hint: Which group or list received this money?</p>
            </div>

            <!-- Person Selection -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label for="payPersonSelect" class="block text-xs font-bold text-slate-700">
                  Who made this payment? <span class="text-emerald-700">*</span>
                </label>
                <button id="payAddNewPersonBtn" class="text-xs text-emerald-700 font-semibold hover:underline">
                  ＋ New person
                </button>
              </div>
              ${
                people.length === 0
                  ? `<div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      No people in this record yet. Tap "New person" above to add someone.
                     </div>`
                  : `<select id="payPersonSelect" class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
                      ${people
                        .map(
                          (p) =>
                            `<option value="${p.id}" ${p.id === selectedPersonId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
                        )
                        .join('')}
                    </select>`
              }
              <p class="text-xs text-slate-500 mt-1">Short hint: The person whose balance will be updated.</p>
            </div>

            ${
              selectedPerson && target > 0
                ? `<div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span class="text-slate-500">Paid so far: </span>
                      <strong class="text-slate-800">${formatNaira(paidSoFar)}</strong>
                    </div>
                    <div>
                      <span class="text-slate-500">Remaining: </span>
                      <strong class="text-emerald-700">${formatNaira(remaining)}</strong>
                    </div>
                   </div>`
                : ''
            }

            <!-- Amount Input -->
            <div>
              <label for="payAmountInput" class="block text-xs font-bold text-slate-700 mb-1">
                Amount paid (₦) <span class="text-emerald-700">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₦</span>
                <input
                  id="payAmountInput"
                  type="number"
                  inputmode="decimal"
                  min="1"
                  step="any"
                  placeholder="e.g. 5000"
                  class="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
                  value="${remaining > 0 ? remaining : ''}"
                />
              </div>
              <p class="text-xs text-slate-500 mt-1">Short hint: Enter the exact amount received.</p>
              ${
                remaining > 0
                  ? `<div class="flex gap-1.5 mt-2">
                      <button type="button" id="fillRemainingBtn" class="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-medium hover:bg-emerald-100 transition-colors">
                        Pay full balance (${formatNaira(remaining)})
                      </button>
                    </div>`
                  : ''
              }
            </div>

            <!-- Date -->
            <div>
              <label for="payDateInput" class="block text-xs font-bold text-slate-700 mb-1">
                Payment date
              </label>
              <input
                id="payDateInput"
                type="date"
                class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                value="${new Date().toISOString().slice(0, 10)}"
              />
              <p class="text-xs text-slate-500 mt-1">Short hint: Defaults to today.</p>
            </div>

            <!-- Note -->
            <div>
              <label for="payNoteInput" class="block text-xs font-bold text-slate-700 mb-1">
                Note or payment method (optional)
              </label>
              <input
                id="payNoteInput"
                type="text"
                placeholder="e.g. Bank transfer, Cash, Opay, First installment"
                class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder-slate-400"
              />
              <p class="text-xs text-slate-500 mt-1">Short hint: Useful for remembering how the money was sent.</p>
            </div>

          </div>

          <!-- Modal Action -->
          <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button id="cancelPayBtn" class="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button id="savePaymentBtn" class="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5">
              Save payment ✓
            </button>
          </div>

        </div>
      </div>
    `;

    // Handlers
    modalRoot.querySelector('#closePayModal')?.addEventListener('click', () => (modalRoot.innerHTML = ''));
    modalRoot.querySelector('#cancelPayBtn')?.addEventListener('click', () => (modalRoot.innerHTML = ''));

    modalRoot.querySelector('#payRecordSelect')?.addEventListener('change', (e) => {
      selectedRecordId = (e.target as HTMLSelectElement).value;
      selectedPersonId = '';
      renderForm();
    });

    modalRoot.querySelector('#payPersonSelect')?.addEventListener('change', (e) => {
      selectedPersonId = (e.target as HTMLSelectElement).value;
      renderForm();
    });

    modalRoot.querySelector('#fillRemainingBtn')?.addEventListener('click', () => {
      const input = modalRoot.querySelector('#payAmountInput') as HTMLInputElement;
      if (input) input.value = String(remaining);
    });

    modalRoot.querySelector('#payAddNewPersonBtn')?.addEventListener('click', () => {
      openAddPersonModal(selectedRecordId, () => {
        renderForm();
      });
    });

    modalRoot.querySelector('#savePaymentBtn')?.addEventListener('click', () => {
      if (!selectedPersonId) {
        toast('Please pick or add a person first.');
        return;
      }
      const amountEl = modalRoot.querySelector('#payAmountInput') as HTMLInputElement;
      const amountVal = Number(amountEl?.value || 0);
      if (!amountVal || amountVal <= 0) {
        toast('Please enter a valid payment amount.');
        amountEl?.focus();
        return;
      }
      const dateEl = modalRoot.querySelector('#payDateInput') as HTMLInputElement;
      const noteEl = modalRoot.querySelector('#payNoteInput') as HTMLInputElement;

      const payment = store.addPayment(
        selectedPersonId,
        amountVal,
        dateEl?.value || new Date().toISOString().slice(0, 10),
        noteEl?.value || null
      );

      if (payment) {
        const found = store.getPerson(selectedPersonId);
        toast(`Payment of ${formatNaira(amountVal)} logged for ${found?.person.name || 'person'}!`);
        modalRoot.innerHTML = '';
      }
    });
  }

  renderForm();
}

export function openShareModal(defaultRecordId?: string) {
  const modalRootEl = document.getElementById('modalRoot');
  if (!modalRootEl) return;
  const modalRoot: HTMLElement = modalRootEl;

  const records = store.getRecords();
  if (records.length === 0) {
    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 border border-slate-100 text-center animate-slide-up">
          <div class="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-1">No links to share yet</h3>
          <p class="text-xs text-slate-600 mb-4 leading-relaxed">
            Create your first record and add members to get shareable links for everyone.
          </p>
          <button id="modalStartGuide" class="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors">
            Start step-by-step guide
          </button>
        </div>
      </div>
    `;
    modalRoot.querySelector('#modalStartGuide')?.addEventListener('click', () => {
      modalRoot.innerHTML = '';
      renderStepByStepGuideModal(modalRoot, () => (modalRoot.innerHTML = ''));
    });
    return;
  }

  let selectedRecordId = defaultRecordId || records[0].id;

  function renderShareView() {
    const currentRec = store.getRecord(selectedRecordId) || records[0];
    const groupUrl = getShareUrl('g/' + currentRec.id);

    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[92vh] overflow-hidden animate-slide-up border border-slate-100">
          
          <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-emerald-700">Instant Sharing</span>
              <h2 class="text-base font-bold text-slate-900">Share progress links</h2>
            </div>
            <button id="closeShareModal" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="p-5 overflow-y-auto space-y-5 text-sm">
            
            <!-- Select record -->
            <div>
              <label for="shareRecordSelect" class="block text-xs font-bold text-slate-700 mb-1">
                Select record
              </label>
              <select id="shareRecordSelect" class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
                ${records
                  .map(
                    (r) =>
                      `<option value="${r.id}" ${r.id === selectedRecordId ? 'selected' : ''}>${escapeHtml(r.title)}</option>`
                  )
                  .join('')}
              </select>
            </div>

            <!-- Group Link Card -->
            <div class="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 space-y-3">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Group Link (Public Directory)
                  </h4>
                  <p class="text-xs text-slate-600 mt-0.5">
                    Send to your group chat. Anyone can choose their name to see what they paid.
                  </p>
                </div>
              </div>

              <div class="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-700 break-all select-all">
                ${groupUrl}
              </div>

              <div class="flex items-center gap-2">
                <button id="copyGroupUrlBtn" class="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  Copy group link
                </button>
                <a
                  href="https://wa.me/?text=${encodeURIComponent('Hello! Check our contributions and progress for ' + currentRec.title + ' here: ' + groupUrl)}"
                  target="_blank"
                  rel="noopener"
                  class="py-2 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  WhatsApp
                </a>
              </div>
            </div>

            <!-- Personal Links List -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Personal Links (${currentRec.people.length})
                </h4>
                <span class="text-xs text-slate-500">Private per person</span>
              </div>
              <p class="text-xs text-slate-500 mb-3">
                Short hint: Each person sees their own payments and what is left.
              </p>

              ${
                currentRec.people.length === 0
                  ? `<div class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                      No members in this record yet. Add people to generate private links.
                     </div>`
                  : `<div class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-60 overflow-y-auto">
                      ${currentRec.people
                        .map((p) => {
                          const paid = p.payments.reduce((a, b) => a + Number(b.amount || 0), 0);
                          const pUrl = getShareUrl('p/' + p.id);
                          return `
                            <div class="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                              <div class="min-w-0 flex-1">
                                <div class="font-bold text-slate-900 text-xs truncate">${escapeHtml(p.name)}</div>
                                <div class="text-[11px] text-slate-500">
                                  ${formatNaira(paid)} paid ${
                            currentRec.target
                              ? '· ' +
                                Math.min(100, Math.round((paid / currentRec.target) * 100)) +
                                '%'
                              : ''
                          }
                                </div>
                              </div>
                              <div class="flex items-center gap-1.5 shrink-0">
                                <button class="copy-person-link px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1" data-url="${pUrl}">
                                  Copy
                                </button>
                                <a
                                  href="https://wa.me/${p.phone ? p.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent('Hi ' + p.name + '! Here is your payment progress link for ' + currentRec.title + ': ' + pUrl)}"
                                  target="_blank"
                                  rel="noopener"
                                  class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg transition-colors"
                                >
                                  WhatsApp
                                </a>
                              </div>
                            </div>
                          `;
                        })
                        .join('')}
                    </div>`
              }
            </div>

          </div>

          <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button id="closeShareFooter" class="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition-colors">
              Done
            </button>
          </div>

        </div>
      </div>
    `;

    modalRoot.querySelector('#closeShareModal')?.addEventListener('click', () => (modalRoot.innerHTML = ''));
    modalRoot.querySelector('#closeShareFooter')?.addEventListener('click', () => (modalRoot.innerHTML = ''));

    modalRoot.querySelector('#shareRecordSelect')?.addEventListener('change', (e) => {
      selectedRecordId = (e.target as HTMLSelectElement).value;
      renderShareView();
    });

    modalRoot.querySelector('#copyGroupUrlBtn')?.addEventListener('click', async () => {
      const ok = await copyToClipboard(groupUrl);
      if (ok) toast('Group link copied to clipboard!');
      else toast('Could not copy link');
    });

    modalRoot.querySelectorAll('.copy-person-link').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const url = (e.currentTarget as HTMLElement).getAttribute('data-url') || '';
        const ok = await copyToClipboard(url);
        if (ok) toast('Personal progress link copied!');
      });
    });
  }

  renderShareView();
}

export function openAddPersonModal(recordId: string, onAdded?: () => void) {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const record = store.getRecord(recordId);
  if (!record) return;

  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white w-full max-w-sm rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-up border border-slate-100">
        
        <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-emerald-700">Add Member</span>
            <h2 class="text-base font-bold text-slate-900">Add person</h2>
          </div>
          <button id="closeAddPerson" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-5 space-y-4 text-sm">
          <div>
            <label for="personNameInput" class="block text-xs font-bold text-slate-700 mb-1">
              Person's full name <span class="text-emerald-700">*</span>
            </label>
            <input
              id="personNameInput"
              type="text"
              placeholder="e.g. Amina Bello"
              class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder-slate-400"
              autofocus
            />
            <p class="text-xs text-slate-500 mt-1">Short hint: The name that will appear on their payment link.</p>
          </div>

          <div>
            <label for="personPhoneInput" class="block text-xs font-bold text-slate-700 mb-1">
              Phone number (optional)
            </label>
            <input
              id="personPhoneInput"
              type="tel"
              placeholder="e.g. 08012345678"
              class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder-slate-400"
            />
            <p class="text-xs text-slate-500 mt-1">Short hint: For quick WhatsApp link sharing.</p>
          </div>
        </div>

        <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button id="cancelAddPerson" class="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button id="saveAddPerson" class="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors">
            Add person ✓
          </button>
        </div>

      </div>
    </div>
  `;

  modalRoot.querySelector('#closeAddPerson')?.addEventListener('click', () => (modalRoot.innerHTML = ''));
  modalRoot.querySelector('#cancelAddPerson')?.addEventListener('click', () => (modalRoot.innerHTML = ''));

  modalRoot.querySelector('#saveAddPerson')?.addEventListener('click', () => {
    const nameEl = modalRoot.querySelector('#personNameInput') as HTMLInputElement;
    const name = nameEl?.value.trim();
    if (!name) {
      toast('Please enter a name.');
      nameEl?.focus();
      return;
    }
    const phoneEl = modalRoot.querySelector('#personPhoneInput') as HTMLInputElement;
    const phone = phoneEl?.value.trim() || null;

    store.addPerson(recordId, name, phone);
    toast(`${name} added to record!`);
    modalRoot.innerHTML = '';
    if (onAdded) onAdded();
  });
}

export function openAddDebtModal(defaultType: DebtType = 'receivable', onSaved?: () => void) {
  const modalRootEl = document.getElementById('modalRoot');
  if (!modalRootEl) return;
  const modalRoot: HTMLElement = modalRootEl;

  let selectedType: DebtType = defaultType;

  function renderDebtModal() {
    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[92vh] overflow-hidden animate-slide-up border border-slate-100">
          
          <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div>
              <span class="text-xs font-semibold tracking-wider text-emerald-700">Debt & Credit</span>
              <h2 class="text-base font-bold text-slate-900">Add a debt</h2>
            </div>
            <button id="closeDebtModal" aria-label="Close" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="p-5 overflow-y-auto space-y-4 text-sm">
            
            <div>
              <span class="block text-xs font-bold text-slate-700 mb-1.5">
                Who owes who? <span class="text-emerald-700">*</span>
              </span>
              <div class="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  id="debtTypeReceivable"
                  class="py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedType === 'receivable'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }"
                >
                  Owed to me
                </button>
                <button
                  type="button"
                  id="debtTypePayable"
                  class="py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedType === 'payable'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }"
                >
                  I owe
                </button>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                Short hint: Pick "Owed to me" if someone needs to pay you back, or "I owe" if you need to pay them.
              </p>
            </div>

            <div>
              <label for="debtPersonInput" class="block text-xs font-bold text-slate-700 mb-1">
                Person or business name <span class="text-emerald-700">*</span>
              </label>
              <input
                id="debtPersonInput"
                type="text"
                placeholder="e.g. Tunde Balogun or Kano Supply"
                class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder-slate-400"
                autofocus
              />
              <p class="text-xs text-slate-500 mt-1">Short hint: Who is this debt with?</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="debtAmountInput" class="block text-xs font-bold text-slate-700 mb-1">
                  Amount (₦) <span class="text-emerald-700">*</span>
                </label>
                <div class="relative">
                  <span class="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₦</span>
                  <input
                    id="debtAmountInput"
                    type="number"
                    inputmode="decimal"
                    min="1"
                    step="any"
                    placeholder="e.g. 25000"
                    class="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold tabular-nums"
                  />
                </div>
                <p class="text-xs text-slate-500 mt-1">Short hint: Total amount owed.</p>
              </div>

              <div>
                <label for="debtDueInput" class="block text-xs font-bold text-slate-700 mb-1">
                  Due date (optional)
                </label>
                <input
                  id="debtDueInput"
                  type="date"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <p class="text-xs text-slate-500 mt-1">Short hint: We track overdue days from this date.</p>
              </div>
            </div>

            <div>
              <label for="debtPhoneInput" class="block text-xs font-bold text-slate-700 mb-1">
                Phone number (optional)
              </label>
              <input
                id="debtPhoneInput"
                type="tel"
                placeholder="e.g. 08012345678"
                class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder-slate-400"
              />
            </div>

            <div>
              <label for="debtNoteInput" class="block text-xs font-bold text-slate-700 mb-1">
                Reason or note (optional)
              </label>
              <input
                id="debtNoteInput"
                type="text"
                placeholder="e.g. Balance for goods supplied"
                class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder-slate-400"
              />
              <p class="text-xs text-slate-500 mt-1">Short hint: Helps you remember what this balance is for.</p>
            </div>

          </div>

          <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button id="cancelDebtBtn" class="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button id="saveDebtBtn" class="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors">
              Save debt
            </button>
          </div>

        </div>
      </div>
    `;

    modalRoot.querySelector('#closeDebtModal')?.addEventListener('click', () => (modalRoot.innerHTML = ''));
    modalRoot.querySelector('#cancelDebtBtn')?.addEventListener('click', () => (modalRoot.innerHTML = ''));

    modalRoot.querySelector('#debtTypeReceivable')?.addEventListener('click', () => {
      selectedType = 'receivable';
      const personVal = (modalRoot.querySelector('#debtPersonInput') as HTMLInputElement)?.value || '';
      const amtVal = (modalRoot.querySelector('#debtAmountInput') as HTMLInputElement)?.value || '';
      const dueVal = (modalRoot.querySelector('#debtDueInput') as HTMLInputElement)?.value || '';
      const phoneVal = (modalRoot.querySelector('#debtPhoneInput') as HTMLInputElement)?.value || '';
      const noteVal = (modalRoot.querySelector('#debtNoteInput') as HTMLInputElement)?.value || '';
      renderDebtModal();
      (modalRoot.querySelector('#debtPersonInput') as HTMLInputElement).value = personVal;
      (modalRoot.querySelector('#debtAmountInput') as HTMLInputElement).value = amtVal;
      (modalRoot.querySelector('#debtDueInput') as HTMLInputElement).value = dueVal;
      (modalRoot.querySelector('#debtPhoneInput') as HTMLInputElement).value = phoneVal;
      (modalRoot.querySelector('#debtNoteInput') as HTMLInputElement).value = noteVal;
    });

    modalRoot.querySelector('#debtTypePayable')?.addEventListener('click', () => {
      selectedType = 'payable';
      const personVal = (modalRoot.querySelector('#debtPersonInput') as HTMLInputElement)?.value || '';
      const amtVal = (modalRoot.querySelector('#debtAmountInput') as HTMLInputElement)?.value || '';
      const dueVal = (modalRoot.querySelector('#debtDueInput') as HTMLInputElement)?.value || '';
      const phoneVal = (modalRoot.querySelector('#debtPhoneInput') as HTMLInputElement)?.value || '';
      const noteVal = (modalRoot.querySelector('#debtNoteInput') as HTMLInputElement)?.value || '';
      renderDebtModal();
      (modalRoot.querySelector('#debtPersonInput') as HTMLInputElement).value = personVal;
      (modalRoot.querySelector('#debtAmountInput') as HTMLInputElement).value = amtVal;
      (modalRoot.querySelector('#debtDueInput') as HTMLInputElement).value = dueVal;
      (modalRoot.querySelector('#debtPhoneInput') as HTMLInputElement).value = phoneVal;
      (modalRoot.querySelector('#debtNoteInput') as HTMLInputElement).value = noteVal;
    });

    modalRoot.querySelector('#saveDebtBtn')?.addEventListener('click', () => {
      const personEl = modalRoot.querySelector('#debtPersonInput') as HTMLInputElement;
      const amountEl = modalRoot.querySelector('#debtAmountInput') as HTMLInputElement;
      const dueEl = modalRoot.querySelector('#debtDueInput') as HTMLInputElement;
      const phoneEl = modalRoot.querySelector('#debtPhoneInput') as HTMLInputElement;
      const noteEl = modalRoot.querySelector('#debtNoteInput') as HTMLInputElement;

      const personName = personEl?.value.trim();
      const amount = Number(amountEl?.value || 0);

      if (!personName) {
        toast('Please enter the person or business name.');
        personEl?.focus();
        return;
      }
      if (!amount || amount <= 0) {
        toast('Please enter a valid amount.');
        amountEl?.focus();
        return;
      }

      store.createDebt({
        type: selectedType,
        person_name: personName,
        phone: phoneEl?.value.trim() || null,
        original_amount: amount,
        due_date: dueEl?.value || null,
        notes: noteEl?.value.trim() || null,
      });

      toast(`Saved debt with ${personName}.`);
      modalRoot.innerHTML = '';
      if (onSaved) onSaved();
    });
  }

  renderDebtModal();
}

export function openRepaymentModal(debtId: string, onSaved?: () => void) {
  const modalRootEl = document.getElementById('modalRoot');
  if (!modalRootEl) return;
  const modalRoot: HTMLElement = modalRootEl;

  const debt = store.getDebt(debtId);
  if (!debt) return;

  const info = getDebtStatusInfo(debt.original_amount, debt.repayments, debt.due_date);

  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[92vh] overflow-hidden animate-slide-up border border-slate-100">
        
        <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <span class="text-xs font-semibold tracking-wider text-emerald-700">
              ${debt.type === 'receivable' ? 'Money received' : 'Money paid back'}
            </span>
            <h2 class="text-base font-bold text-slate-900">Log repayment</h2>
          </div>
          <button id="closeRepayModal" aria-label="Close" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-5 overflow-y-auto space-y-4 text-sm">
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <div class="font-bold text-slate-900">${escapeHtml(debt.person_name)}</div>
              <div class="text-slate-500 mt-0.5">${debt.type === 'receivable' ? 'Owes you' : 'You owe'} · ${info.dueText}</div>
            </div>
            <div class="text-right tabular-nums">
              <div class="text-slate-500">Balance left</div>
              <div class="font-extrabold text-sm ${debt.type === 'receivable' ? 'text-emerald-700' : 'text-rose-700'}">
                ${formatNaira(info.balance)}
              </div>
            </div>
          </div>

          <div>
            <label for="repayAmountInput" class="block text-xs font-bold text-slate-700 mb-1">
              Repayment amount (₦) <span class="text-emerald-700">*</span>
            </label>
            <div class="relative">
              <span class="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₦</span>
              <input
                id="repayAmountInput"
                type="number"
                inputmode="decimal"
                min="1"
                step="any"
                value="${info.balance > 0 ? info.balance : ''}"
                class="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold tabular-nums"
              />
            </div>
            <p class="text-xs text-slate-500 mt-1">Short hint: Enter part payment or the full balance left.</p>
          </div>

          <div>
            <label for="repayDateInput" class="block text-xs font-bold text-slate-700 mb-1">
              Date paid
            </label>
            <input
              id="repayDateInput"
              type="date"
              value="${getLocalDateString(0)}"
              class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label for="repayNoteInput" class="block text-xs font-bold text-slate-700 mb-1">
              Note (optional)
            </label>
            <input
              id="repayNoteInput"
              type="text"
              placeholder="e.g. Bank transfer or cash"
              class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder-slate-400"
            />
          </div>

          ${
            debt.repayments.length > 0
              ? `
                <div class="pt-2 border-t border-slate-100">
                  <div class="text-xs font-bold text-slate-700 mb-2">Previous payments (${debt.repayments.length})</div>
                  <div class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                    ${debt.repayments
                      .map(
                        (r) => `
                          <div class="px-3 py-2 flex items-center justify-between text-xs bg-white">
                            <span class="text-slate-600">${escapeHtml(r.paid_on)}${r.note ? ' · ' + escapeHtml(r.note) : ''}</span>
                            <span class="font-bold text-slate-900 tabular-nums">${formatNaira(r.amount)}</span>
                          </div>
                        `
                      )
                      .join('')}
                  </div>
                </div>
              `
              : ''
          }
        </div>

        <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button id="cancelRepayBtn" class="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button id="saveRepayBtn" class="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors">
            Save repayment
          </button>
        </div>

      </div>
    </div>
  `;

  modalRoot.querySelector('#closeRepayModal')?.addEventListener('click', () => (modalRoot.innerHTML = ''));
  modalRoot.querySelector('#cancelRepayBtn')?.addEventListener('click', () => (modalRoot.innerHTML = ''));

  modalRoot.querySelector('#saveRepayBtn')?.addEventListener('click', () => {
    const amtEl = modalRoot.querySelector('#repayAmountInput') as HTMLInputElement;
    const dateEl = modalRoot.querySelector('#repayDateInput') as HTMLInputElement;
    const noteEl = modalRoot.querySelector('#repayNoteInput') as HTMLInputElement;

    const amt = Number(amtEl?.value || 0);
    if (!amt || amt <= 0) {
      toast('Please enter a valid repayment amount.');
      amtEl?.focus();
      return;
    }

    store.addDebtRepayment(
      debt.id,
      amt,
      dateEl?.value || getLocalDateString(0),
      noteEl?.value.trim() || null
    );
    toast(`Recorded ${formatNaira(amt)} for ${debt.person_name}.`);
    modalRoot.innerHTML = '';
    if (onSaved) onSaved();
  });
}

