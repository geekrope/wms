import { Item, type Category } from "./types.js";

const LOCALE_REGEX = /\{(\w+)\}/g;

const LOCALES = {
    EN: {
        item_repr_full: "CATEGORY {cat}, BOX {box}, EXPIRY DATE {date}, STATUS {status}",
        page_title_intake: "ITEM INTAKE",
        page_title_storage: "STORAGE",
        page_title_categories: "CATEGORIES",
        page_title_boxes: "BOXES",
        header_main: "INVENTORY ALLOCATION",
        header_storage: "STORAGE INVENTORY",
        header_categories: "CATEGORY MANAGEMENT",
        header_boxes: "BOXES OVERVIEW",
        header_boxes_graph: "BOXES STACKING GRAPH & ACCESSIBILITY",
        graph_box_label: "BOX {box}\nWEIGHT: {weight} g\nTO CLEAR: {cost} g",
        th_box: "BOX #",
        th_weight: "BOX WEIGHT",
        th_max_load: "MAX LOAD",
        no_limit: "NO LIMIT",
        th_access_cost: "CLEARANCE WEIGHT",
        direct_access: "DIRECT ACCESS",
        categories_list_header: "ALL CATEGORIES",
        box_item_count: "ITEMS IN BOX: {count}",
        category_input: "ENTER CATEGORY",
        add_category_btn: "ADD NEW CATEGORY",
        label_expiry: "EXPIRATION DATE:",
        label_box: "STORAGE UNIT:",
        box_placeholder: "SELECT BOX...",
        box: "UNIT:",
        register_item_btn: "REGISTER IN STORAGE",
        label_status: "STATUS",
        selected_category: "SELECTED CATEGORY: {category}",
        no_category_selected: "CATEGORY NOT SELECTED",
        category_repr: "NAME: {title} WEIGHT: {weight} g",
        category_title_label: "CATEGORY",
        category_weight_label: "WEIGHT",
        weight: "WEIGHT {weight} g",
        header_box_add: "ADD NEW BOX",
        label_add_box: "BOX NUMBER №",
        box_title_label: "BOX NAME",
        label_max_load: "MAX LOAD",
        add_box_btn: "ADD BOX",
        log_add_box: "ADDED BOX \"{title}\".",
        log_add_box_fail: "FAILED TO ADD BOX: {error}",

        page_title_restore: "BACKUP",
        header_restore: "DATA MANAGEMENT",
        page_title_dashboard: "SQL DASHBOARD",
        btn_export: "EXPORT DATA",
        btn_import: "IMPORT ARCHIVE",
        page_number: "PAGE {num}",
        initial_log: "STORAGE SYSTEM ACTIVE...",
        initial_log_fail: "STORAGE SYSTEM ACTIVE FAILED...",

        item_placeholder: "SELECT CATEGORY...",
        list_item_label: "UNTIL {date} | STATUS {status}",
        count_label: "TOTAL ITEMS: {count}",
        status_action_0: "DECOMMISSION",
        status_action_1: "RECOVER",
        status_0: "INTACT",
        status_1: "DENTED/RUSTED",
        btn_delete: "REMOVE",

        page_title_stats: "INVENTORY ANALYTICS",
        label_date_filter: "EXPIRES WITHIN THE RANGE",

        log_add_cat: "ADDED \"{val}\" TO LOG.",
        log_add_cat_fail: "FAILED TO ADD CATEGORY: ALREADY EXISTS",
        log_delete_cat: "DELETED CATEGORY \"{val}\"",
        log_delete_cat_fail: "FAILED TO DELETE CATEGORY",
        log_add_item: "ITEM {cat} UNTIL {date} REGISTERED IN BOX {box}",
        log_add_fail: "FAILED TO ADD ITEM",
        log_update_status: "SET {meta} STATUS TO {status}",
        log_delete: "DELETED {meta}",
        log_move: "MOVED {meta} TO BOX {box}",
        log_import: "ARCHIVE IMPORTED INTO STORAGE",
        log_export: "ARCHIVE EXPORTED FROM STORAGE",
        log_move_fail: "FAILED TO MOVE {meta} TO BOX {box}",
        version: "Inventory Management System v2.0"
    },

    RU_FORMAL: {
        item_repr_full: "КАТЕГОРИЯ {cat}, КОРОБКА {box}, ДО {date}, СТАТУС {status}",
        page_title_intake: "ПРИЕМ ТМЦ",
        page_title_storage: "СКЛАД",
        page_title_categories: "КАТЕГОРИИ",
        page_title_boxes: "ЯЧЕЙКИ",
        header_main: "РАСПРЕДЕЛЕНИЕ ЗАПАСОВ",
        header_storage: "ОБЗОР СКЛАДА",
        header_categories: "УПРАВЛЕНИЕ КАТЕГОРИЯМИ",
        header_boxes: "ОБЗОР ЯЧЕЕК",
        header_boxes_graph: "ГРАФ ДОСТУПНОСТИ И ШТАБЕЛИРОВАНИЯ ЯЧЕЕК",
        graph_box_label: "ЯЧЕЙКА {box}\nВЕС: {weight} г\nДОСТУП: {cost} г",
        th_box: "ЯЧЕЙКА",
        th_weight: "СОБСТВЕННЫЙ ВЕС",
        th_max_load: "ГРУЗОПОДЪЕМНОСТЬ",
        no_limit: "БЕЗ ОГРАНИЧЕНИЯ",
        th_access_cost: "ВЕС ДЛЯ СНЯТИЯ",
        direct_access: "ПРЯМОЙ ДОСТУП",
        categories_list_header: "СПИСОК КАТЕГОРИЙ",
        box_item_count: "ЕДИНИЦ В ЯЧЕЙКЕ: {count}",
        category_input: "ВВЕДИТЕ КАТЕГОРИЮ",
        add_category_btn: "ДОБАВИТЬ НОВУЮ КАТЕГОРИЮ",
        label_expiry: "СРОК ГОДНОСТИ ДО:",
        label_box: "МЕСТО ХРАНЕНИЯ:",
        box_placeholder: "ВЫБЕРИТЕ ЯЧЕЙКУ...",
        box: "ЯЧЕЙКА:",
        register_item_btn: "ЗАРЕГИСТРИРОВАТЬ",
        label_status: "СТАТУС",
        selected_category: "ВЫБРАННАЯ КАТЕГОРИЯ: {category}",
        no_category_selected: "КАТЕГОРИЯ НЕ ВЫБРАНА",
        category_repr: "НАЗВАНИЕ: {title} ВЕС: {weight} г",
        category_title_label: "КАТЕГОРИЯ",
        category_weight_label: "ВЕС",
        weight: "ВЕС {weight} г",
        header_box_add: "ДОБАВИТЬ НОВУЮ ЯЧЕЙКУ",
        label_add_box: "НОВАЯ ЯЧЕЙКА №",
        box_title_label: "НАЗВАНИЕ ЯЧЕЙКИ",
        label_max_load: "МАКС. НАГРУЗКА",
        add_box_btn: "ДОБАВИТЬ ЯЧЕЙКУ",
        log_add_box: "ЯЧЕЙКА \"{title}\" ДОБАВЛЕНА.",
        log_add_box_fail: "НЕ УДАЛОСЬ ДОБАВИТЬ ЯЧЕЙКУ: {error}",

        page_title_restore: "РЕЗЕРВНОЕ КОПИРОВАНИЕ",
        header_restore: "УПРАВЛЕНИЕ ДАННЫМИ",
        page_title_dashboard: "SQL ПАНЕЛЬ",
        btn_export: "ЭКСПОРТИРОВАТЬ",
        btn_import: "ЗАГРУЗИТЬ АРХИВ",
        page_number: "СТРАНИЦА {num}",
        initial_log: "СИСТЕМА МОНИТОРИНГА ЗАПУЩЕНА...",
        initial_log_fail: "В СИСТЕМЕ МОНИТОРИНГА ПРОИЗОШЕЛ СБОЙ...",

        item_placeholder: "ВЫБЕРИТЕ КАТЕГОРИЮ...",
        list_item_label: "ДО {date} | СТАТУС {status}",
        count_label: "ВСЕГО ЕДИНИЦ: {count}",
        status_action_0: "СПИСАТЬ",
        status_action_1: "ВОССТАНОВИТЬ",
        status_0: "ЦЕЛЫЙ",
        status_1: "МЯТЫЙ/ПРОРЖАВЕВШИЙ",
        btn_delete: "УДАЛИТЬ",

        page_title_stats: "АНАЛИЗ",
        label_date_filter: "ДИАПАЗОН ДАТ",

        log_add_cat: "КАТЕГОРИЯ \"{val}\" ВНЕСЕНА В РЕЕСТР.",
        log_add_cat_fail: "НЕ УДАЛОСЬ ДОБАВИТЬ КАТЕГОРИЮ",
        log_delete_cat: "КАТЕГОРИЯ \"{val}\" УДАЛЕНА ИЗ РЕЕСТРА.",
        log_delete_cat_fail: "НЕ УДАЛОСЬ УДАЛИТЬ КАТЕГОРИЮ",
        log_add_item: "ПРОДУКЦИЯ {cat} (СРОК {date}) РАЗМЕЩЕНА В ЯЧЕЙКЕ {box}",
        log_add_fail: "НЕ УДАЛОСЬ ДОБАВИТЬ ОБЪЕКТ",
        log_update_status: "ОБЪЕКТУ {meta} ПРИСВОЕН СТАТУС {status}",
        log_delete: "ОБЪЕКТ {meta} УДАЛЕН",
        log_move: "ОБЪЕКТ {meta} ПЕРЕНЕСЕН В КОРОБКУ {box}",
        log_move_fail: "НЕ УДАЛОСЬ ПЕРЕНЕСТИ {meta} В КОРОБКУ {box}",
        log_import: "АРХИВ ЗАГРУЖЕН В СИСТЕМУ",
        log_export: "АРХИВ СОХРАНЕН",
        version: "СИСТЕМА УПРАВЛЕНИЯ ТМЦ v2.0"
    }
};

export type LocaleType = typeof LOCALES.EN;
export type Locales = keyof typeof LOCALES;

export function getCurrentLocale(): LocaleType {
    const params = new URLSearchParams(window.location.search);
    let lang = params.get('lang') as Locales;

    if (lang) {
        sessionStorage.setItem('app_lang', lang);
    } else {
        lang = (sessionStorage.getItem('app_lang') as Locales) || 'EN';
    }

    return LOCALES[lang as Locales] || LOCALES.EN;
}

export function renderPattern(key: keyof LocaleType, params: Record<string, any> = {}): string {
    const template = getCurrentLocale()[key] || key;
    return template.replace(LOCALE_REGEX, (match, prop) => {
        return params[prop] !== undefined ? String(params[prop]) : match;
    });
}

export function localizeDOM(): void {
    document.querySelectorAll('[data-locale]').forEach(el => {
        const key = el.getAttribute('data-locale') as keyof LocaleType;
        el.textContent = renderPattern(key);
    });

    document.querySelectorAll('[data-locale-placeholder]').forEach(el => {
        const key = el.getAttribute('data-locale-placeholder') as keyof LocaleType;
        (el as HTMLInputElement).placeholder = renderPattern(key);
    });
}

export function repr(item: Item | Category): string {
    if (item instanceof Item) {
        return renderPattern("item_repr_full", {
            cat: item.category,
            box: item.box,
            date: new Date(item.expiration_date).toLocaleDateString(),
            status: renderPattern(item.status === 0 ? "status_0" : "status_1")
        });
    }
    else {
        return renderPattern("category_repr", {
            title: item.title,
            weight: item.weight !== null ? item.weight.toString() : "N/A"
        });
    }
}