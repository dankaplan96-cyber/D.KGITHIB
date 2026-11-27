'use strict';
// תבניות טפסים התחלתיות. התוכן הוא דוגמה בלבד – יש להחליף בנוסחים הרשמיים של בית החולים.
//
// סוגי שדות: text, textarea, number, date, time, email, tel, select, radio,
// checkbox (תיבה יחידה), checklist (רשימת תיבות), file, heading (כותרת), info (טקסט הסבר)
//
// שלבי מסלול (workflow):
//   { type: 'direct_manager' }        – המנהל/ת של המחלקה של מגיש/ת הטופס
//   { type: 'role', role: 'hr' }      – תור משותף לכל בעלי התפקיד (hr / education / admin)

const MGR = { type: 'direct_manager', label: 'אישור מנהל/ת ישיר/ה' };
const HR = { type: 'role', role: 'hr', label: 'קליטה במשאבי אנוש' };
const EDU = { type: 'role', role: 'education', label: 'אישור מחלקת הדרכה' };

const DEMO_NOTE = '⚠️ תוכן לדוגמה בלבד – יש להחליף בנוסח הרשמי והמעודכן של הנוהל בבית החולים.';

const SHIFT_OPTS = ['בוקר', 'ערב', 'לילה'];

const templates = [
  // ───────────── כוח אדם ─────────────
  {
    code: 'hr-vacation',
    title: 'בקשת חופשה',
    category: 'hr',
    description: 'בקשה לחופשה שנתית / ללא תשלום / השתלמות. עוברת לאישור מנהל/ת ולאחר מכן למשאבי אנוש.',
    fields: [
      { key: 'type', label: 'סוג החופשה', type: 'select', required: true, options: ['חופשה שנתית', 'חופשה ללא תשלום', 'ימי השתלמות', 'חופשת אבל', 'מילואים', 'אחר'] },
      { key: 'from', label: 'מתאריך', type: 'date', required: true },
      { key: 'to', label: 'עד תאריך', type: 'date', required: true },
      { key: 'days', label: 'מספר ימי עבודה', type: 'number', required: true },
      { key: 'replacement', label: 'מחליף/ה במשמרות (אם סוכם)', type: 'text' },
      { key: 'notes', label: 'הערות', type: 'textarea' },
    ],
    workflow: [MGR, HR],
  },
  {
    code: 'hr-sick',
    title: 'הודעה על היעדרות מחלה',
    category: 'hr',
    description: 'דיווח על ימי מחלה בצירוף אישור רפואי.',
    fields: [
      { key: 'from', label: 'מתאריך', type: 'date', required: true },
      { key: 'to', label: 'עד תאריך', type: 'date', required: true },
      { key: 'kind', label: 'סוג', type: 'radio', required: true, options: ['מחלת עובד/ת', 'מחלת ילד/ה', 'מחלת בן/בת זוג', 'מחלת הורה'] },
      { key: 'certificate', label: 'אישור מחלה (PDF / תמונה)', type: 'file', help: 'ניתן לצלם את האישור ישירות מהטלפון. עד 5MB.' },
      { key: 'notes', label: 'הערות', type: 'textarea' },
    ],
    workflow: [MGR, HR],
  },
  {
    code: 'hr-shift-swap',
    title: 'בקשה להחלפת משמרת',
    category: 'hr',
    description: 'החלפת משמרת בין שני עובדים באישור האחראי/ת.',
    fields: [
      { key: 'date', label: 'תאריך המשמרת', type: 'date', required: true },
      { key: 'shift', label: 'משמרת', type: 'radio', required: true, options: SHIFT_OPTS },
      { key: 'with', label: 'שם העובד/ת המחליף/ה', type: 'text', required: true },
      { key: 'return_date', label: 'תאריך משמרת חוזרת (אם יש)', type: 'date' },
      { key: 'consent', label: 'העובד/ת המחליף/ה הסכים/ה להחלפה', type: 'checkbox', required: true },
    ],
    workflow: [MGR],
  },
  {
    code: 'hr-overtime',
    title: 'דיווח שעות נוספות / תגבור',
    category: 'hr',
    description: 'דיווח על שעות נוספות או משמרת תגבור לאישור.',
    fields: [
      { key: 'date', label: 'תאריך', type: 'date', required: true },
      { key: 'start', label: 'שעת התחלה', type: 'time', required: true },
      { key: 'end', label: 'שעת סיום', type: 'time', required: true },
      { key: 'reason', label: 'סיבה', type: 'select', required: true, options: ['חוסר בכוח אדם', 'עומס במחלקה', 'ליווי מטופל', 'הדרכה', 'אחר'] },
      { key: 'notes', label: 'פירוט', type: 'textarea' },
    ],
    workflow: [MGR, HR],
  },
  {
    code: 'hr-personal-details',
    title: 'עדכון פרטים אישיים',
    category: 'hr',
    description: 'עדכון כתובת, טלפון ואיש קשר לחירום.',
    fields: [
      { key: 'address', label: 'כתובת מגורים', type: 'text' },
      { key: 'phone', label: 'טלפון נייד', type: 'tel' },
      { key: 'email', label: 'דוא"ל', type: 'email' },
      { key: 'h_emerg', label: 'איש קשר לחירום', type: 'heading' },
      { key: 'emergency_name', label: 'שם', type: 'text' },
      { key: 'emergency_relation', label: 'קרבה', type: 'text' },
      { key: 'emergency_phone', label: 'טלפון', type: 'tel' },
    ],
    workflow: [HR],
  },
  {
    code: 'hr-confidentiality',
    title: 'הצהרת סודיות ושמירה על פרטיות מטופלים',
    category: 'hr',
    description: 'הצהרה נדרשת מכל עובד/ת, סטודנט/ית ומתנדב/ת.',
    document_text: `${DEMO_NOTE}

אני מתחייב/ת לשמור בסוד כל מידע רפואי ואישי על מטופלים ובני משפחותיהם שיגיע אליי במסגרת עבודתי, ולא למסור אותו לכל גורם שאינו מוסמך לכך.

אני מתחייב/ת לעיין במידע רפואי רק במידה הנדרשת לצורך הטיפול, לא לצלם מטופלים או מסמכים, ולא לפרסם מידע ברשתות החברתיות.

ידוע לי כי הפרת התחייבות זו עלולה להוות עבירה על חוק זכויות החולה וחוק הגנת הפרטיות ולהוביל לצעדים משמעתיים.`,
    fields: [
      { key: 'ack', label: 'קראתי, הבנתי ואני מתחייב/ת לפעול על פי האמור', type: 'checkbox', required: true },
    ],
    workflow: [HR],
  },
  {
    code: 'hr-course-request',
    title: 'בקשה ליציאה להשתלמות / קורס',
    category: 'hr',
    description: 'בקשה להשתתפות בקורס או בהשתלמות מקצועית.',
    fields: [
      { key: 'course', label: 'שם הקורס / ההשתלמות', type: 'text', required: true },
      { key: 'institution', label: 'מוסד', type: 'text' },
      { key: 'from', label: 'תאריך התחלה', type: 'date', required: true },
      { key: 'to', label: 'תאריך סיום', type: 'date' },
      { key: 'funding', label: 'בקשת מימון', type: 'radio', options: ['ללא', 'מימון חלקי', 'מימון מלא'] },
      { key: 'relevance', label: 'רלוונטיות לתפקיד', type: 'textarea', required: true },
    ],
    workflow: [MGR, EDU],
  },

  // ───────────── הדרכה / קליטה ─────────────
  {
    code: 'train-new-nurse',
    title: 'חוברת קליטה – אחות/אח חדש/ה',
    category: 'training',
    audience: 'אחות/אח',
    description: 'חוברת הדרכה וקליטה לאחיות ואחים חדשים. יש לסמן כל נושא שהודרך ולחתום בסיום.',
    document_text: `${DEMO_NOTE}

ברוכים הבאים לצוות הסיעוד! החוברת מלווה את תקופת הקליטה שלך במחלקה.
יש לעבור על הנושאים יחד עם החונך/ת, לסמן כל נושא שהודרך, ולחתום בסיום תקופת הקליטה.
בסיום – הטופס עובר לאישור האחות האחראית ולמחלקת ההדרכה.`,
    fields: [
      { key: 'start_date', label: 'תאריך תחילת עבודה', type: 'date', required: true },
      { key: 'preceptor', label: 'שם החונך/ת', type: 'text', required: true },
      { key: 'topics', label: 'נושאי הדרכה שהושלמו', type: 'checklist', required: true, options: [
        'היכרות עם המחלקה, הצוות ומבנה המשמרות',
        'בטיחות אש ופינוי בחירום',
        'החייאה ועגלת החייאה',
        'נוהל מתן תרופות ובטיחות תרופתית',
        'מניעת זיהומים והיגיינת ידיים',
        'מניעת נפילות',
        'מניעת פצעי לחץ',
        'זיהוי מטופל ושימוש בצמיד זיהוי',
        'תיעוד סיעודי ברשומה הממוחשבת',
        'דיווח על אירוע חריג',
        'זכויות החולה ושמירת סודיות',
        'טיפול במטופל עם דמנציה / דליריום',
      ] },
      { key: 'notes', label: 'הערות החונך/ת', type: 'textarea' },
    ],
    workflow: [MGR, EDU],
  },
  {
    code: 'train-student',
    title: 'חוברת קליטה – סטודנט/ית לסיעוד',
    category: 'training',
    audience: 'סטודנט/ית',
    description: 'קליטת סטודנטים להתנסות קלינית במחלקה.',
    document_text: `${DEMO_NOTE}

ברוכים הבאים להתנסות הקלינית. יש לעבור על הנושאים עם המדריך/ה הקליני/ת ולחתום בסיום.`,
    fields: [
      { key: 'institution', label: 'מוסד לימודים', type: 'text', required: true },
      { key: 'year', label: 'שנת לימודים', type: 'select', options: ['א', 'ב', 'ג', 'ד', 'הסבה'] },
      { key: 'instructor', label: 'שם המדריך/ה הקליני/ת', type: 'text', required: true },
      { key: 'from', label: 'תחילת ההתנסות', type: 'date', required: true },
      { key: 'to', label: 'סיום ההתנסות', type: 'date' },
      { key: 'topics', label: 'נושאים שהודרכו', type: 'checklist', required: true, options: [
        'היכרות עם המחלקה והצוות',
        'בטיחות אש ופינוי בחירום',
        'מניעת זיהומים והיגיינת ידיים',
        'מניעת נפילות',
        'שמירת סודיות ופרטיות',
        'גבולות סמכות הסטודנט/ית ופעולות בפיקוח',
        'דיווח על אירוע חריג',
      ] },
    ],
    workflow: [MGR, EDU],
  },
  {
    code: 'train-aide',
    title: 'חוברת קליטה – כוח עזר',
    category: 'training',
    audience: 'כוח עזר',
    description: 'קליטה והדרכה לעובדי כוח עזר וטיפול.',
    document_text: `${DEMO_NOTE}

ברוכים הבאים! יש לעבור על הנושאים עם האחראי/ת ולחתום בסיום.`,
    fields: [
      { key: 'start_date', label: 'תאריך תחילת עבודה', type: 'date', required: true },
      { key: 'trainer', label: 'שם המדריך/ה', type: 'text', required: true },
      { key: 'topics', label: 'נושאים שהודרכו', type: 'checklist', required: true, options: [
        'היכרות עם המחלקה והצוות',
        'בטיחות אש ופינוי בחירום',
        'היגיינת ידיים וציוד מגן',
        'הרמה והעברה בטוחה של מטופל',
        'מניעת נפילות',
        'האכלה בטוחה ומניעת חנק',
        'שמירה על כבוד ופרטיות המטופל',
        'טיפול בפסולת ובכביסה מזוהמת',
      ] },
    ],
    workflow: [MGR],
  },

  // ───────────── נהלים ─────────────
  {
    code: 'proc-hand-hygiene',
    title: 'אישור קריאת נוהל – היגיינת ידיים ומניעת זיהומים',
    category: 'procedure',
    description: 'יש לקרוא את הנוהל ולאשר בחתימה.',
    document_text: `${DEMO_NOTE}

1. מטרה: צמצום העברת זיהומים בין מטופלים, צוות וסביבה.
2. חמשת הרגעים להיגיינת ידיים: לפני מגע במטופל; לפני פעולה אספטית; לאחר חשיפה לנוזלי גוף; לאחר מגע במטופל; לאחר מגע בסביבת המטופל.
3. חיטוי בתכשיר על בסיס אלכוהול כברירת מחדל; רחיצה במים וסבון כשהידיים מלוכלכות לעין.
4. שימוש בציוד מגן אישי בהתאם לסוג הבידוד.`,
    fields: [
      { key: 'ack', label: 'קראתי והבנתי את הנוהל ואפעל על פיו', type: 'checkbox', required: true },
    ],
    workflow: [MGR],
  },
  {
    code: 'proc-falls',
    title: 'אישור קריאת נוהל – מניעת נפילות',
    category: 'procedure',
    description: 'יש לקרוא את הנוהל ולאשר בחתימה.',
    document_text: `${DEMO_NOTE}

1. הערכת סיכון לנפילה בקבלת המטופל, בכל שינוי במצבו ולפחות אחת לתקופה שנקבעה.
2. התאמת סביבה: מיטה נמוכה, בלמים נעולים, תאורה, פעמון בהישג יד.
3. סימון מטופל בסיכון גבוה ועדכון הצוות במסירה.
4. לאחר נפילה: בדיקת המטופל, דיווח לרופא, תיעוד ודיווח אירוע חריג.`,
    fields: [
      { key: 'ack', label: 'קראתי והבנתי את הנוהל ואפעל על פיו', type: 'checkbox', required: true },
    ],
    workflow: [MGR],
  },
  {
    code: 'proc-incident',
    title: 'אישור קריאת נוהל – דיווח על אירוע חריג',
    category: 'procedure',
    description: 'יש לקרוא את הנוהל ולאשר בחתימה.',
    document_text: `${DEMO_NOTE}

1. כל איש צוות שהיה מעורב או עד לאירוע חריג ידווח עליו בהקדם.
2. הדיווח נועד ללמידה ולשיפור – לא לחיפוש אשמים.
3. הדיווח יכלול תיאור עובדתי, זמן, מקום ופעולות שננקטו.`,
    fields: [
      { key: 'ack', label: 'קראתי והבנתי את הנוהל ואפעל על פיו', type: 'checkbox', required: true },
    ],
    workflow: [MGR],
  },
];

module.exports = { templates };
