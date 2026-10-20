// ========== ALFAJR - PROFILE FUNCTIONS ==========
// js/profile.js — توابع صفحه پروفایل مشتری
// این فایل باید قبل از main.js و بعد از config.js بارگذاری شود

// ========== ساختار جدول اندازه‌ها ==========
// هر ردیف: برچسب + یک یا چند فیلد (کلیدها همون کلیدهای قدیمی دیتابیس هستن، پس مشتری‌های قبلی دست‌نخورده می‌مونن)
const MEASUREMENT_ROWS = [
    { label: "قد",          fields: ["قد"] },
    { label: "شانه",        fields: ["شانه_یک", "شانه_دو"] },
    { label: "آستین",       fields: ["آستین_یک"] },
    { label: "کف",          fields: ["آستین_دو"] },
    { label: "ساق",         fields: ["آستین_سه"] },
    { label: "بغل",         fields: ["بغل"] },
    { label: "دامن",        fields: ["دامن"] },
    { label: "گردن",        fields: ["گردن"] },
    { label: "شلوار",       fields: ["شلوار"] },
    { label: "دم پاچه",     fields: ["دم_پاچه"] },
    { label: "بر",          fields: ["بر_تمبان"] },
    { label: "خشتک",        fields: ["خشتک"] },
    { label: "چاک پتی",     fields: ["چاک_پتی"] },
    { label: "زیربغل",      fields: ["دور_سینه"] },
    { label: "تعداد سفارش", fields: ["تعداد_سفارش"] },
    { label: "مقدار تکه",   fields: ["مقدار_تکه"] }
];

// یک ورودی عددی (اندازه یا جزئیات) — با کلاس measurement-input تا ذخیره‌ی خودکار و ناوبری کیبورد کار کنه
function numberInputHtml(field, value, label) {
    const v = (value === undefined || value === null) ? '' : value;
    return `<input type="number" inputmode="decimal" class="measurement-input mcell-input"
                data-field="${field}" value="${escapeHtml(String(v))}" placeholder="--"
                step="0.5" min="0" aria-label="${escapeHtml(label)}"
                oninput="updateMeasurement('${field}', this.value)"
                onkeydown="handleMeasurementKeydown(event)">`;
}

// ==========================================
// ۱. رندر اندازه‌گیری‌ها (جدول وسط)
// ==========================================
function renderMeasurements() {
    const container = document.getElementById('measurementsContainer');
    if (!container || currentCustomerIndex === null) return;

    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    const rows = MEASUREMENT_ROWS.map(row => `
        <div class="frow">
            <label class="frow-label">${row.label}</label>
            <div class="frow-inputs">
                ${row.fields.map(f => numberInputHtml(f, customer.measurements[f], row.label)).join('')}
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="panel-head">
            <h3><i class="fas fa-ruler"></i> اندازه‌ها</h3>
        </div>
        <div class="measurements-table">${rows}</div>
    `;
}


// ==========================================
// ۲. بروزرسانی یک اندازه
// ==========================================
function updateMeasurement(field, value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    customer.measurements[field] = value !== '' ? parseFloat(value) : '';
    saveCustomer();

    // اگه «تعداد سفارش» تغییر کرد، مبلغ کل توی بخش قیمت هم آپدیت بشه
    if (field === 'تعداد_سفارش') {
        renderPriceDelivery();
    }
}


// ==========================================
// ۳. ناوبری کیبورد در اندازه‌گیری‌ها
// ==========================================
function handleMeasurementKeydown(event) {
    if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;

    const inputs   = Array.from(document.querySelectorAll('.measurement-input'));
    const current  = inputs.indexOf(event.target);

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (current > 0) { inputs[current - 1].focus(); inputs[current - 1].select(); }
    } else {
        // Enter یا ArrowDown
        event.preventDefault();
        if (current < inputs.length - 1) { inputs[current + 1].focus(); inputs[current + 1].select(); }
    }
}


// ==========================================
// ۴. رندر مدل‌ها (جدول سمت چپ)
// هر دسته یک فیلد بازشوئه: روی اون بزنی باز می‌شه، چندتا انتخاب می‌کنی و با «تأیید»
// (یا زدن بیرون از فیلد) دوباره جمع می‌شه. گزینه‌های انتخاب‌شده همیشه توی فیلد دیده می‌شن.
// ==========================================
let openModelType = null;          // دسته‌ی بازِ فعلی
let openModelCustomerId = null;    // برای بستن پنل وقتی مشتری عوض می‌شه

function modelCategories() {
    return [
        { type: 'yakhun',   label: 'مدل یخن',   list: AppConfig.YAKHUN_MODELS },
        { type: 'sleeve',   label: 'مدل آستین', list: AppConfig.SLEEVE_MODELS },
        { type: 'skirt',    label: 'مدل دامن',  list: AppConfig.SKIRT_MODELS },
        { type: 'features', label: 'ویژگی‌ها',   list: AppConfig.FEATURES_LIST },
        { type: 'pati',     label: 'مدل پتی',   list: AppConfig.PATI_MODELS },
        { type: 'buttons',  label: 'مدل دکمه',  list: AppConfig.BUTTON_MODELS },
        { type: 'trousers', label: 'مدل شلوار', list: AppConfig.TROUSER_MODELS }
    ];
}

function renderModels() {
    const container = document.getElementById('modelsContainer');
    if (!container || currentCustomerIndex === null) return;

    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    if (openModelCustomerId !== customer.id) {
        openModelCustomerId = customer.id;
        openModelType = null;
    }

    const models = customer.models || {};
    const allSubOptions = (models.subOptions && typeof models.subOptions === 'object') ? models.subOptions : {};
    const selectedOf = type => Array.isArray(models[type]) ? models[type] : [];
    const subsOf = (type, model) =>
        (allSubOptions[type] && Array.isArray(allSubOptions[type][model])) ? allSubOptions[type][model] : [];

    // دکمه‌ی یک مدل + زیرگزینه‌هایش (مثل کفک ← با پلت / گول)
    const optionHtml = (type, model) => {
        const selected = selectedOf(type).includes(model);
        const subList = AppConfig.SUB_OPTIONS[type]?.[model];
        let subHtml = '';
        if (selected && subList && subList.length) {
            const chosen = subsOf(type, model);
            subHtml = `<div class="model-suboptions-wrapper">${subList.map(sub => `
                <button type="button" class="model-suboption ${chosen.includes(sub) ? 'selected' : ''}"
                    onclick="event.stopPropagation(); selectSubOption('${type}', '${model}', '${sub}')">
                    ${chosen.includes(sub) ? '<span class="checkmark">✓</span>' : ''}${escapeHtml(sub)}
                </button>`).join('')}</div>`;
        }
        return `
            <button type="button" class="model-option multi-select ${selected ? 'selected' : ''}"
                onclick="toggleMultiSelect('${type}', '${model}')">
                ${selected ? '<span class="checkmark">✓</span>' : ''}${escapeHtml(model)}
            </button>${subHtml}`;
    };

    // خلاصه‌ی انتخاب‌ها که توی فیلد بسته نشون داده می‌شه
    const summaryHtml = (type) => {
        const picked = selectedOf(type);
        if (!picked.length) return '<span class="mfield-empty">انتخاب کنید…</span>';
        return picked.map(m => {
            const subs = subsOf(type, m);
            return `<span class="mfield-tag">${escapeHtml(m)}${subs.length ? ` (${escapeHtml(subs.join('، '))})` : ''}</span>`;
        }).join('');
    };

    let rows = '';
    modelCategories().forEach(cat => {
        const isOpen = openModelType === cat.type;
        const count = selectedOf(cat.type).length;
        rows += `
            <div class="mfield ${isOpen ? 'open' : ''} ${count ? 'has-value' : ''}">
                <button type="button" class="mfield-head" aria-expanded="${isOpen}"
                    onclick="toggleModelPanel('${cat.type}')">
                    <span class="mfield-label">${cat.label}</span>
                    <span class="mfield-value">${summaryHtml(cat.type)}</span>
                    <span class="mfield-caret" aria-hidden="true"></span>
                </button>
                ${isOpen ? `
                <div class="mfield-body">
                    <div class="model-options">${cat.list.map(m => optionHtml(cat.type, m)).join('')}</div>
                    <button type="button" class="mfield-done" onclick="closeModelPanel()">
                        <i class="fas fa-check-circle"></i> تأیید
                    </button>
                </div>` : ''}
            </div>`;

        // فیلدهای عددی که زیر همین دسته می‌آن (بند کف، عرض پتی، ...)
        AppConfig.DETAIL_FIELDS.filter(d => d.after === cat.type).forEach(d => {
            rows += `
            <div class="frow">
                <label class="frow-label">${d.label}</label>
                <div class="frow-inputs">
                    ${numberInputHtml(d.key, customer.measurements[d.key], d.label)}
                    ${d.unit ? `<span class="unit">${d.unit}</span>` : ''}
                </div>
            </div>`;
        });
    });

    container.innerHTML = `
        <div class="panel-head">
            <h3><i class="fas fa-tshirt"></i> مدل‌ها و ویژگی‌ها</h3>
        </div>
        <div class="models-grid">${rows}</div>
    `;
}

function toggleModelPanel(type) {
    openModelType = (openModelType === type) ? null : type;
    renderModels();
}

function closeModelPanel() {
    if (openModelType === null) return;
    openModelType = null;
    renderModels();
}

// کلیک بیرون از فیلدهای مدل → پنل باز جمع بشه
// (اگه عنصر کلیک‌شده با رندر مجدد از صفحه حذف شده، نادیده می‌گیریم)
document.addEventListener('click', (e) => {
    if (openModelType === null) return;
    if (!e.target || !e.target.isConnected) return;
    if (e.target.closest('.mfield')) return;
    closeModelPanel();
});


// ==========================================
// ۶. تغییر وضعیت مدل چندانتخابی
// ==========================================
function toggleMultiSelect(type, value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    if (!Array.isArray(customer.models[type])) customer.models[type] = [];

    const idx = customer.models[type].indexOf(value);
    if (idx === -1) {
        customer.models[type].push(value);
    } else {
        customer.models[type].splice(idx, 1);
        // اگه مدلی که deselect شد زیرگزینه انتخاب‌شده داشت، پاکش کن
        if (customer.models.subOptions && customer.models.subOptions[type]) {
            delete customer.models.subOptions[type][value];
        }
    }

    renderModels();
    saveCustomer();
}


// ==========================================
// ۶.۱. انتخاب زیرگزینه‌ی یک مدل (مثلاً بی‌پلت/با‌پلت برای کفک، یا انگلیسی برای جیب رو)
// چندانتخابی: می‌شه چند زیرگزینه رو هم‌زمان برای یه مدل انتخاب کرد
// ==========================================
function selectSubOption(type, parentModel, subOption) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    if (!customer.models.subOptions) customer.models.subOptions = {};
    if (!customer.models.subOptions[type]) customer.models.subOptions[type] = {};
    if (!Array.isArray(customer.models.subOptions[type][parentModel])) {
        customer.models.subOptions[type][parentModel] = [];
    }

    const list = customer.models.subOptions[type][parentModel];
    const idx = list.indexOf(subOption);
    if (idx === -1) {
        list.push(subOption);
    } else {
        list.splice(idx, 1);
    }

    renderModels();
    saveCustomer();
}


// ==========================================
// ۷. رندر مشخصات، قیمت و تحویل (جدول سمت راست)
// ==========================================
function renderPriceDelivery() {
    const container = document.getElementById('priceDeliveryContainer');
    if (!container || currentCustomerIndex === null) return;

    const customer   = customers[currentCustomerIndex];
    if (!customer) return;

    const price      = customer.sewingPriceAfghani || '';
    const isPaid     = customer.paymentReceived    || false;
    const payDate    = customer.paymentDate        || null;
    const delivery   = customer.deliveryDay        || '';
    const orderQtyRaw = parseInt(customer.measurements?.['تعداد_سفارش'], 10);
    const orderQty   = (!isNaN(orderQtyRaw) && orderQtyRaw > 0) ? orderQtyRaw : 1;

    const liveText = price
        ? (orderQty > 1
            ? `${orderQty} جوره × ${formatPrice(price)} = ${formatPrice(price * orderQty)} ${currentCurrency}`
            : `${formatPrice(price)} ${currentCurrency}`)
        : '';

    container.innerHTML = `
        <div class="panel-head">
            <h3><i class="fas fa-user"></i> مشخصات مشتری</h3>
        </div>
        <div class="field-list">

            <div class="frow">
                <label class="frow-label" for="infoName">اسم مشتری</label>
                <div class="frow-inputs">
                    <input type="text" id="infoName" class="text-input" value="${escapeHtml(customer.name || '')}"
                        autocomplete="off" onchange="updateCustomerInfo('name', this)">
                </div>
            </div>

            <div class="frow">
                <label class="frow-label" for="infoPhone">شماره تماس</label>
                <div class="frow-inputs">
                    <input type="tel" inputmode="tel" id="infoPhone" class="text-input ltr" value="${escapeHtml(customer.phone || '')}"
                        autocomplete="off" onchange="updateCustomerInfo('phone', this)">
                </div>
            </div>

            <div class="frow">
                <label class="frow-label">سریال</label>
                <div class="frow-inputs">
                    <input type="text" class="text-input ltr" value="${escapeHtml(String(customer.id))}" readonly tabindex="-1" aria-readonly="true">
                </div>
            </div>

            <div class="frow price-section">
                <label class="frow-label" for="sewingPrice">قیمت جوره</label>
                <div class="frow-inputs price-input-group">
                    <input type="number" inputmode="numeric" id="sewingPrice" class="text-input ltr" value="${price}"
                        placeholder="--" min="0" oninput="updatePrice(this.value)">
                    <span class="unit currency">${escapeHtml(currentCurrency)}</span>
                </div>
                <div class="price-display-live">${liveText}</div>
            </div>

            <div class="frow">
                <label class="frow-label" for="deliveryDaySelect">تاریخ تحویل</label>
                <div class="frow-inputs">
                    <select id="deliveryDaySelect" class="text-input" onchange="setDeliveryDay(this.value)">
                        <option value="">انتخاب روز…</option>
                        ${AppConfig.DAYS_OF_WEEK.map(day =>
                            `<option value="${day}" ${delivery === day ? 'selected' : ''}>${day}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="frow payment-section">
                <label class="frow-label">پرداخت</label>
                <div class="frow-inputs">
                    <button type="button" class="payment-toggle" onclick="togglePayment()" aria-pressed="${isPaid}">
                        <span class="payment-checkbox ${isPaid ? 'checked' : ''}">
                            <span class="checkbox-icon">${isPaid ? '✓' : ''}</span>
                            <span>${isPaid ? 'پرداخت شده' : 'پرداخت نشده'}</span>
                        </span>
                    </button>
                </div>
                ${isPaid && payDate ? `<div class="payment-date"><i class="fas fa-calendar-check"></i> ${formatDate(payDate)}</div>` : ''}
            </div>

        </div>
    `;
}


// ==========================================
// ۷.۱. ویرایش مستقیم نام و شماره (بدون پنجره‌ی جدا)
// ==========================================
function updateCustomerInfo(field, input) {
    if (currentCustomerIndex === null || !input) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    const value = input.value.trim();

    if (field === 'name') {
        if (value.length < 2) {
            showNotification('نام باید حداقل ۲ کاراکتر باشد', 'error');
            input.value = customer.name || '';
            return;
        }
        customer.name = value;
        const el = document.getElementById('profileName');
        if (el) el.textContent = value;
    } else if (field === 'phone') {
        if (value.length < 7 || !/^\d+$/.test(value)) {
            showNotification('شماره باید حداقل ۷ رقم عددی باشد', 'error');
            input.value = customer.phone || '';
            return;
        }
        customer.phone = value;
        const el = document.getElementById('profilePhoneText');
        if (el) el.textContent = value;
    } else {
        return;
    }
    saveCustomer();
}


// ==========================================
// ۸. بروزرسانی قیمت
// ==========================================
function updatePrice(value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    customer.sewingPriceAfghani = value ? parseInt(value) : null;

    // فقط نمایش قیمت رو آپدیت کن بدون re-render کامل (تا فوکوس روی اینپوت نپره)
    const priceSection = document.querySelector('#priceDeliveryContainer .price-section');
    if (priceSection) {
        const display = priceSection.querySelector('.price-display-live');
        if (display) {
            const price = customer.sewingPriceAfghani;
            if (price && price > 0) {
                const orderQtyRaw = parseInt(customer.measurements?.['تعداد_سفارش'], 10);
                const orderQty = (!isNaN(orderQtyRaw) && orderQtyRaw > 0) ? orderQtyRaw : 1;
                display.textContent = orderQty > 1
                    ? `${orderQty} جوره × ${formatPrice(price)} = ${formatPrice(price * orderQty)} ${currentCurrency}`
                    : `${formatPrice(price)} ${currentCurrency}`;
            } else {
                display.textContent = '';
            }
        }
    }

    saveCustomer();
}


// ==========================================
// ۹. تغییر وضعیت پرداخت
// ==========================================
function togglePayment() {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    customer.paymentReceived = !customer.paymentReceived;
    customer.paymentDate     = customer.paymentReceived ? new Date().toISOString() : null;

    renderPriceDelivery();
    saveCustomer();

    showNotification(
        customer.paymentReceived ? '✓ وضعیت پرداخت: پرداخت شده' : '✗ وضعیت پرداخت: پرداخت نشده',
        customer.paymentReceived ? 'success' : 'warning'
    );
}


// ==========================================
// ۱۰. تنظیم روز تحویل
// ==========================================
function setDeliveryDay(day) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    customer.deliveryDay = AppConfig.DAYS_OF_WEEK.includes(day) ? day : '';
    saveCustomer();
}


// ==========================================
// ۱۱. رندر سفارشات
// ==========================================
function renderOrders() {
    const container = document.getElementById('ordersContainer');
    if (!container || currentCustomerIndex === null) return;

    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    const orders = customer.orders || [];

    const ordersHtml = orders.length === 0
        ? `<div class="empty-orders"><i class="fas fa-clipboard"></i><p>هنوز سفارشی ثبت نشده است</p></div>`
        : orders.map((order, idx) => {
            const dateStr  = order.date ? new Date(order.date).toLocaleDateString('fa-IR') : '';
            const isDone   = order.status === 'done';
            return `
                <div class="order-item">
                    <div class="order-content">
                        <div class="order-header">
                            <span class="order-number">سفارش ${idx + 1}</span>
                            <span class="order-date">${dateStr}</span>
                        </div>
                        <div class="order-details">
                            <textarea class="order-textarea"
                                placeholder="توضیحات سفارش را اینجا وارد کنید..."
                                onchange="updateOrderDescription(${idx}, this.value)">${escapeHtml(order.description || '')}</textarea>
                            <button type="button" class="order-status ${isDone ? 'done' : 'pending'}" onclick="toggleOrderStatus(${idx})">
                                <i class="fas ${isDone ? 'fa-check-circle' : 'fa-clock'}"></i>
                                ${isDone ? 'تحویل داده شد' : 'در دست تهیه'}
                            </button>
                        </div>
                    </div>
                    <button class="btn-delete-order" onclick="deleteOrder(${idx})" title="حذف سفارش" aria-label="حذف سفارش">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`;
        }).join('');

    container.innerHTML = `
        <div class="panel-head">
            <h3><i class="fas fa-clipboard-list"></i> سفارشات <span class="count-badge">${orders.length}</span></h3>
        </div>
        <div class="orders-list">${ordersHtml}</div>
        <button type="button" class="btn-success btn-add-order" onclick="addOrder()">
            <i class="fas fa-plus"></i> افزودن سفارش جدید
        </button>
    `;
}


// ==========================================
// ۱۲. افزودن سفارش جدید
// ==========================================
function addOrder() {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    if (!Array.isArray(customer.orders)) customer.orders = [];

    customer.orders.push({
        id:          Date.now().toString(),
        description: '',
        date:        new Date().toISOString(),
        status:      'pending'
    });

    renderOrders();
    saveCustomer();

    showNotification('سفارش جدید اضافه شد', 'success');

    // فوکوس روی textarea سفارش جدید
    setTimeout(() => {
        const areas = document.querySelectorAll('#ordersContainer textarea');
        if (areas.length) areas[areas.length - 1].focus();
    }, 100);
}


// ==========================================
// ۱۳. حذف سفارش
// ==========================================
function deleteOrder(index) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer || !customer.orders) return;

    if (!confirm(`آیا از حذف سفارش ${index + 1} مطمئن هستید؟`)) return;

    customer.orders.splice(index, 1);
    renderOrders();
    saveCustomer();

    showNotification('سفارش حذف شد', 'success');
}


// ==========================================
// توابع کمکی سفارشات
// ==========================================
function updateOrderDescription(index, value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer || !customer.orders?.[index]) return;

    customer.orders[index].description = value;
    saveCustomer();
}

function toggleOrderStatus(index) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer || !customer.orders?.[index]) return;

    customer.orders[index].status = customer.orders[index].status === 'done' ? 'pending' : 'done';
    renderOrders();
    saveCustomer();
}


// ==========================================
// Export به window
// ==========================================
window.renderMeasurements      = renderMeasurements;
window.renderModels            = renderModels;
window.renderPriceDelivery     = renderPriceDelivery;
window.renderOrders            = renderOrders;
window.updateMeasurement       = updateMeasurement;
window.handleMeasurementKeydown = handleMeasurementKeydown;
window.toggleMultiSelect       = toggleMultiSelect;
window.selectSubOption         = selectSubOption;
window.toggleModelPanel        = toggleModelPanel;
window.closeModelPanel         = closeModelPanel;
window.updateCustomerInfo      = updateCustomerInfo;
window.updatePrice             = updatePrice;
window.togglePayment           = togglePayment;
window.setDeliveryDay          = setDeliveryDay;
window.addOrder                = addOrder;
window.deleteOrder             = deleteOrder;
window.updateOrderDescription  = updateOrderDescription;
window.toggleOrderStatus       = toggleOrderStatus;
