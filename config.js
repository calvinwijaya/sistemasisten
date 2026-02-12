const ADMIN_EMAILS = [
    "calvin.wijaya@ugm.ac.id",
    "cecep.pratama@ugm.ac.id"
];

const DOSEN_MAP = {
    "HRT": "Prof. Dr. Ir. Harintaka, S.T., M.T., IPU., ASEAN Eng.",
    "NRW": "Prof. Ir. Nurrohmat Widjajanti, M.T., Ph.D., IPU., ASEAN Eng., APEC Eng.",
    "CAR": "Dr. Ir. Catur Aries Rokhmana, S.T., M.T., IPU.",
    "YLK": "Dr. Ir. Yulaikhah, S.T., M.T., IPU.",
    "LSH": "Prof. Ir. Leni Sophia Heliani, S.T., M.Sc., D.Sc., IPU.",
    "BLM": "Dr. Ir. Bilal Ma’ruf, S.T., M.T.",
    "TAD": "Prof. Ir. Trias Aditya K.M., S.T., M.Sc., Ph.D., IPU., ASEAN Eng.",
    "RMY": "Ir. Rochmad Muryamto, M.Eng.Sc.",
    "DYN": "Dr. Ir. Diyono, S.T., M.T., IPU.",
    "ABS": "Ir. Abdul Basith, S.T., M.Si., Ph.D. ",
    "HST": "Ir. Heri Sutanta, S.T., M.Sc., Ph.D.",
    "PBS": "Dr.Eng. Ir. Purnama Budi Santosa, S.T., M.App.Sc., IPU.",
    "IMA": "Ir. I Made Andi Arsana, S.T., M.E., Ph.D.",
    "RAN": "Ir. Ruli Andaru, S.T., M.Eng., Ph.D.",
    "DWL": "Dr. Ir. Dwi Lestari, S.T., M.E., IPM.",
    "DAT": "Dr. Dedi Atunggal S.P., S.T., M.Sc.",
    "BKC": "Dr. Ir. Bambang Kun Cahyono, S.T., M.Sc., IPU.",
    "CPT": "Cecep Pratama, S.Si., M.Si., D.Sc.,",
    "DPL": "Dany Puguh Laksono, S.T., M.Eng.",
    "MFN": "Ir. Maritsa Faridatunnisa, S.T., M.Eng.",
    "HIL": "Ir. Hilmiyati Ulinnuha, S.T., M.Eng.",
    "FFS": "Ir. Febrian Fitryanik Susanta, S.T., M.Eng.",
    "RSF": "Ressy Fitria, S.T., M.Sc.Eng.",
    "MBS": "Mohamad Bagas Setiawan, S.T., M.Eng.",
    "CLV": "Calvin Wijaya, S.T., M.Eng."
};

// ==== HELPER ====
function getNamaDosen(kode) {
    return DOSEN_MAP?.[kode] || kode || "-";
}

// ==== CONFIG ====
const ENDPOINT_MK = "https://script.google.com/macros/s/AKfycbz9whuSfDGFQN2xs2VpakiGElUD-3FZZtVhGaBBTcq_GnLIozoSVLT3ktSsheq_XC-XDw/exec";
const ENDPOINT_PENDAFTARAN = "https://script.google.com/macros/s/AKfycbxa32wiCAXF_ZJMn9my8nWQ5eeZOKAXH3nAeRWzUJJXK3ymUPtd7FKZ_ttZzrNEQKYzLA/exec";
const ENDPOINT_TERPILIH = "https://script.google.com/macros/s/AKfycbx5F_l-w67oVhaSIWU1N23xW1hzgJFXrGhPdKDJXOKxB1dbxxgIKyklYF7TRtRBknaQrg/exec";
const ENDPOINT_LOGBOOK = "https://script.google.com/macros/s/AKfycbyZC6cN90digHGzzGPkcqWsLSFyyZoSxQMWi3Mwuw7DA8MosII5fvSGKurbHqPGr2bNLw/exec";
const ENDPOINT_REVIU = "https://script.google.com/macros/s/AKfycbxvELkjeRVHeAChO1drsYKe_9ViAzoBivyDtBos98RFguKFWBErL7oHsxET3xVXxaO_Wg/exec";