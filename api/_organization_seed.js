const DEFAULT_ORG_BIDANG = [
  {
    "id": "ketuaUmum",
    "name": "Ketua Umum",
    "image": "images/bidang/umum.jpeg",
    "color": "#2C5F4F"
  },
  {
    "id": "sekretaris",
    "name": "Sekretaris",
    "image": "images/bidang/sekretaris.jpg",
    "color": "#4A7C5D"
  },
  {
    "id": "bendahara",
    "name": "Bendahara",
    "image": "images/bidang/bendahara.jpg",
    "color": "#F39C12"
  },
  {
    "id": "perkaderan",
    "name": "Perkaderan",
    "image": "images/bidang/pkd.png",
    "color": "#E74C3C"
  },
  {
    "id": "pengkajianIlmu",
    "name": "Pengkajian Ilmu Pengetahuan",
    "image": "images/bidang/pengkajianIlmu.jpeg",
    "color": "#3498DB"
  },
  {
    "id": "kajianDakwah",
    "name": "Kajian Dakwah Islam",
    "image": "images/bidang/kajianDakwah.jpg",
    "color": "#9B59B6"
  },
  {
    "id": "apresiasiBudaya",
    "name": "Apresiasi Budaya & Olahraga",
    "image": "images/bidang/apresiasiBudaya.jpg",
    "color": "#1ABC9C"
  },
  {
    "id": "advokasi",
    "name": "Advokasi",
    "image": "images/bidang/advokasi.jpeg",
    "color": "#E67E22"
  },
  {
    "id": "ipmawati",
    "name": "Ipmawati",
    "image": "images/bidang/ipmawati.jpeg",
    "color": "#D946A6"
  }
];

const DEFAULT_ORG_MEMBERS = [
  {
    "name": "Anwar Miftah",
    "role": "Ketua Umum",
    "quote": "Kepemimpinan adalah tanggung jawab.",
    "photo": "images/members/",
    "bidangId": "ketuaUmum"
  },
  {
    "name": "Nauval",
    "role": "Sekretaris",
    "quote": "Administrasi adalah fondasi organisasi yang kuat.",
    "photo": "images/members/hendra-gunawan.jpg",
    "bidangId": "sekretaris"
  },
  {
    "name": "Yasifa Permata",
    "role": "Bendahara Umum",
    "quote": "Transparansi keuangan adalah kunci kepercayaan.",
    "photo": "",
    "bidangId": "bendahara",
    "instagram": "https://www.instagram.com/username"
  },
  {
    "name": "Syifa Nursafitri",
    "role": "Bendahara I",
    "quote": "Transparansi keuangan adalah kunci kepercayaan.",
    "photo": "",
    "bidangId": "bendahara"
  },
  {
    "name": "Arief Bijaksana",
    "role": "Ketua",
    "quote": "",
    "photo": "",
    "bidangId": "perkaderan"
  },
  {
    "name": "Hafiy Muhammad Fhaza",
    "role": "Sekretaris",
    "quote": "",
    "photo": "",
    "bidangId": "perkaderan"
  },
  {
    "name": "Moch Ridwan Nulhakim",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "perkaderan"
  },
  {
    "name": "Ajril Ahmad Fazar",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "perkaderan"
  },
  {
    "name": "Gilang Muhammad Riziq",
    "role": "Ketua Bidang",
    "quote": "",
    "photo": "images/members/gilang1.jpeg",
    "bidangId": "pengkajianIlmu"
  },
  {
    "name": "Zaldy Muhammad Fazri",
    "role": "Sekretaris Bidang",
    "quote": "",
    "photo": "images/members/zaldy.jpeg",
    "bidangId": "pengkajianIlmu"
  },
  {
    "name": "Sudarisman",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "pengkajianIlmu"
  },
  {
    "name": "Fathir Nasrulhaq",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "pengkajianIlmu"
  },
  {
    "name": "Muhammad Fadilah",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "pengkajianIlmu"
  },
  {
    "name": "Ayudia Cempaka Gratia",
    "role": "Anggota",
    "quote": "",
    "photo": "images/members/ayudia.jpeg",
    "bidangId": "pengkajianIlmu"
  },
  {
    "name": "Halida Muna Nurmufidah",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "pengkajianIlmu"
  },
  {
    "name": "Haura Azkya",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "pengkajianIlmu"
  },
  {
    "name": "Debi Rahmawati",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "pengkajianIlmu"
  },
  {
    "name": "Ahsan Hadian Assidiqi",
    "role": "Ketua Bidang",
    "quote": "",
    "photo": "",
    "bidangId": "kajianDakwah"
  },
  {
    "name": "Syifa Khoerunnisa",
    "role": "Sekretaris Bidang",
    "quote": "",
    "photo": "",
    "bidangId": "kajianDakwah"
  },
  {
    "name": "Siti Rahmawati",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "kajianDakwah"
  },
  {
    "name": "Muhammad Iqbal",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "kajianDakwah"
  },
  {
    "name": "Hasna Aurora Ginan Nurillah",
    "role": "Ketua Bidang",
    "quote": "",
    "photo": "",
    "bidangId": "apresiasiBudaya"
  },
  {
    "name": "Najril Muhammad Solfa",
    "role": "Sekretaris Bidang",
    "quote": "",
    "photo": "",
    "bidangId": "apresiasiBudaya"
  },
  {
    "name": "Ganjar",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "apresiasiBudaya"
  },
  {
    "name": "asep",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "apresiasiBudaya"
  },
  {
    "name": "wiri",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "apresiasiBudaya"
  },
  {
    "name": "Tegar",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "apresiasiBudaya"
  },
  {
    "name": "anwar",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "apresiasiBudaya"
  },
  {
    "name": "Muhammad Yopi",
    "role": "Ketua Bidang",
    "quote": "",
    "photo": "images/members/yopi.jpeg",
    "bidangId": "advokasi"
  },
  {
    "name": "Rehan Nurfahmi",
    "role": "Sekretaris Bidang",
    "quote": "",
    "photo": "images/members/rehan.jpeg",
    "bidangId": "advokasi"
  },
  {
    "name": "Raisa Hidayatul Marwah",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "advokasi"
  },
  {
    "name": "Raida Rahma Annastasya",
    "role": "Ketua Bidang",
    "quote": "",
    "photo": "",
    "bidangId": "ipmawati"
  },
  {
    "name": "Sira Tiara Wangi",
    "role": "Sekretaris Bidang",
    "quote": "",
    "photo": "",
    "bidangId": "ipmawati"
  },
  {
    "name": "Shabrina Diwamah Rifki 33",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "ipmawati"
  },
  {
    "name": "Ramira Ramandita",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "ipmawati"
  },
  {
    "name": "Ismi Nurazizah",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "ipmawati"
  },
  {
    "name": "Iklia Wahdiah Nurfitriah",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "ipmawati"
  },
  {
    "name": "Kheisya Zahra Oktavia",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "ipmawati"
  },
  {
    "name": "Anida Uswah Mujahidah",
    "role": "Anggota",
    "quote": "",
    "photo": "",
    "bidangId": "ipmawati"
  }
];

const DEFAULT_ORG_PROGRAMS = [
  {
    "bidangId": "ketuaUmum",
    "name": "",
    "desc": "",
    "status": ""
  },
  {
    "bidangId": "ketuaUmum",
    "name": "",
    "desc": "",
    "status": ""
  },
  {
    "bidangId": "sekretaris",
    "name": "",
    "desc": "",
    "status": ""
  },
  {
    "bidangId": "bendahara",
    "name": "",
    "desc": "",
    "status": ""
  },
  {
    "bidangId": "perkaderan",
    "name": "",
    "desc": "",
    "status": ""
  },
  {
    "bidangId": "perkaderan",
    "name": "",
    "desc": "",
    "status": ""
  },
  {
    "bidangId": "pengkajianIlmu",
    "name": "",
    "desc": "",
    "status": ""
  },
  {
    "bidangId": "pengkajianIlmu",
    "name": "",
    "desc": "",
    "status": ""
  },
  {
    "bidangId": "kajianDakwah",
    "name": "",
    "desc": "",
    "status": ""
  },
  {
    "bidangId": "apresiasiBudaya",
    "name": "",
    "desc": "",
    "status": ""
  },
  {
    "bidangId": "advokasi",
    "name": "",
    "desc": "",
    "status": ""
  },
  {
    "bidangId": "ipmawati",
    "name": "",
    "desc": "",
    "status": ""
  },
  {
    "bidangId": "ipmawati",
    "name": "",
    "desc": "",
    "status": ""
  }
];

module.exports = {
  DEFAULT_ORG_BIDANG,
  DEFAULT_ORG_MEMBERS,
  DEFAULT_ORG_PROGRAMS
};
