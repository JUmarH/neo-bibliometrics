import os
import sqlite3
import json
import re
import pandas as pd
import numpy as np

# Create data directory if not exists
os.makedirs('data', exist_ok=True)

DEPT_MAPPING = {
    'manajemen dan kebijakan publik': 'Manajemen dan Kebijakan Publik',
    'ilmu hubungan internasional': 'Hubungan Internasional',
    'hubungan internasional': 'Hubungan Internasional',
    'ilmu komunikasi': 'Ilmu Komunikasi',
    'sosiologi': 'Sosiologi',
    'politik dan pemerintahan': 'Politik dan Pemerintahan',
    'pembangunan sosial dan kesejahteraan': 'Pembangunan Sosial dan Kesejahteraan'
}

# 18 Single-Word Researchers mapping targets for custom validation
SINGLE_WORD_RESEARCHERS = {
    'e623c115-d093-48f0-9555-98119b7469f8': 'bahruddin',
    '6aada4ea-9dba-4023-8db6-48ccc75667db': 'dafri',
    '7e63a0a4-856b-47f8-94c0-04134be24680': 'haryanto',
    'd2dd19b8-1d12-43c4-b9b0-f47ac2fe3c1d': 'krisdyatmiko',
    '698dd4a8-a3af-47b0-b0a6-5c932b231f12': 'marwa',
    '90f6f96f-f746-4a90-a7fb-d075ded0cd03': 'mulyadi',
    '70f545a4-d555-4b1d-99e2-fc02a334c4ce': 'nurhadi',
    'ccfaa4db-d05e-4d2c-8f17-afa400d25cfb': 'pratikno',
    'dfa168c2-38ca-43f8-9cf8-c4610cb981cc': 'rahayu',
    '78e172f9-0d4a-4ff2-813c-fc51ef6220a2': 'rajiyem',
    '9bafbb4a-97e8-4ced-8ff6-2ccbf51287e0': 'ratminto',
    '59bde7da-f83b-4dc5-becc-f0e44a41863b': 'ratnawati',
    '878cb0b8-b35e-4ca0-b340-a818b2c12fc8': 'suharko',
    '1494e493-fec7-4673-8b26-281faac33c56': 'suharman',
    '0e73e4f6-bae0-4bbd-8bad-fb90d8dd2f87': 'suparjan',
    '48d7c276-c131-4257-82ea-0b651ff5f03c': 'suripto',
    'e36d3cc0-59d2-4fe2-89bb-f404e4940e53': 'susetiawan',
    '4aad0431-8e51-4970-ae04-6ccaaa7c205f': 'syafrizal'
}

# Spaceless lowercase academic titles/degrees and other garbage to ignore completely
IGNORE_DEGREES_NO_SPACES = {
    'mes', 'sip', 'msi', 'su', 'murp', 'ssi', 'mdp', 'mlitt', 'mmktgcomm', 'st', 'mia', 'rerpol', 
    'mpubpol', 'phil', 'ma', 'spsi', 'msocsc', 'msoc', 'msocsci', 'msc', 'sci', 'phd', 'dr', 
    'prof', 'drs', 'dra', 'ir', 'mba', 'mcs', 'spd', 'mpd', 'se', 'ba', 'hum', 'mhum', 'mpa', 
    'mpp', 'mphil', 'h', 'hj', 'ret', 'retired', 'editor', 'editors', 'redaksi', 'author', 
    'coauthor', 'dan', 'and', 'etal', 'null', 'none', 'nan', 'unknown', 'co', 'msocscpratikno',
    'mscsamodrawibawa', 'mscedhimartono', 'sutaryomsc', 'wisnumarthaadiputramsc', 'mscirtyasutami',
    'drkuskridhoambardi', 'drelysusanto', 'profdrpurwosantoso',
    'mpoladmin', 'sh', 'ssos', 'is', 'mpol', 'admin', 'imas', 'mcsecurityanalysis', 'mcybersecanalysis', 'mmktgcoms', 'nurhadi'
}

# List of known countries for affiliation cleaning
KNOWN_COUNTRIES = {
    'indonesia', 'malaysia', 'singapore', 'thailand', 'vietnam', 'philippines', 'brunei', 'cambodia', 'laos', 'myanmar',
    'australia', 'new zealand', 'china', 'japan', 'south korea', 'india', 'taiwan', 'hong kong',
    'united states', 'usa', 'canada', 'united kingdom', 'uk', 'germany', 'france', 'netherlands', 'belgium', 'switzerland',
    'sweden', 'norway', 'finland', 'denmark', 'austria', 'italy', 'spain', 'portugal', 'russia', 'turkey', 'brazil',
    'mexico', 'argentina', 'south africa', 'egypt', 'saudi arabia', 'uae', 'iran'
}

def extract_countries_institutions(affil_str):
    if not affil_str or not isinstance(affil_str, str) or affil_str.lower() in ('nan', 'none', ''):
        return [], []
        
    countries = []
    institutions = []
    
    # Split by semicolon for multiple institutions
    parts = re.split(r'[;]', affil_str)
    for part in parts:
        tokens = [t.strip() for t in part.split(',') if t.strip()]
        if not tokens:
            continue
            
        # First token is typically the institution name
        inst_candidate = tokens[0].strip()
        if len(inst_candidate) > 3 and inst_candidate.lower() not in IGNORE_DEGREES_NO_SPACES:
            institutions.append(inst_candidate)
            
        # Check last token for country
        last_token = tokens[-1].strip()
        last_clean = re.sub(r'[^a-zA-Z\s]', '', last_token).strip().lower()
        if last_clean in KNOWN_COUNTRIES:
            countries.append(last_token)
        elif len(tokens) > 1:
            for tok in reversed(tokens):
                t_clean = re.sub(r'[^a-zA-Z\s]', '', tok).strip().lower()
                if t_clean in KNOWN_COUNTRIES:
                    countries.append(tok.strip())
                    break
                    
    countries = list(dict.fromkeys(countries))
    institutions = list(dict.fromkeys(institutions))
    return countries, institutions

def split_merged_names(author_str):
    if not author_str or not isinstance(author_str, str):
        return []
        
    official_kafa = "Kafa Abdalah Kafaa"
    kafa_pattern = r'\bkafa\s+abdall?ah\s+kafi?aa\b'
    
    match = re.search(kafa_pattern, author_str, re.IGNORECASE)
    if match:
        start, end = match.span()
        left = author_str[:start].strip(" -_.,;*\"'()\\/[]{}#")
        right = author_str[end:].strip(" -_.,;*\"'()\\/[]{}#")
        
        results = [official_kafa]
        if left:
            results.extend(split_merged_names(left))
        if right:
            results.extend(split_merged_names(right))
        return results
        
    return [author_str]

def clean_academic_title(name):
    if not name or not isinstance(name, str):
        return ""
    
    # 1. Decode HTML entities and strip leading/trailing garbage
    name = re.sub(r'&#?\w+;', ' ', name)
    name = name.strip(" -_.,;*\"'()\\/[]{}#\u200b")
    
    # 2. Remove retired prefixes/suffixes (e.g. (ret) or (retired))
    name = re.sub(r'^\(ret\)?\.?\s*', '', name, flags=re.IGNORECASE)
    name = re.sub(r'^\(retired\)?\.?\s*', '', name, flags=re.IGNORECASE)
    
    # 3. Strip common prefix academic titles (case-insensitive)
    prefix_pattern = r'^(prof|dr|drs|dra|ir|hj|h|phil|rer\s*pol|rer\.?\s*pol)\b\.?\s*'
    name = re.sub(prefix_pattern, '', name, flags=re.IGNORECASE)
    name = re.sub(prefix_pattern, '', name, flags=re.IGNORECASE)
    name = re.sub(prefix_pattern, '', name, flags=re.IGNORECASE) # third pass for safety
    
    # 4. Remove academic degrees after comma
    parts = name.split(',')
    if len(parts) > 1:
        first_part = parts[0].strip()
        if len(first_part) > 2:
            name = first_part
            
    # 5. Regex to strip remaining degrees at the end of the name even if no comma exists
    degree_pattern = r'\b(S\.IP|S\s*I\s*P|M\.Si|M\s*Si|S\.U|S\s*U|M\.U\.R\.P|M\s*U\s*R\s*P|S\.Si|S\s*Si|MDP|M\.Litt|M\s*Litt|MMktg\s*Comm|S\.T|S\s*T|M\.I\.A|M\s*I\s*A|rer\s*pol|M\.Pub\s*Pol|M\s*Pub\s*Pol|Phil|M\.A|M\s*A|S\.Psi|S\s*Psi|M\.E\.S|M\s*E\s*S|Ph\.D|PhD|M\.Hum|M\.H\.um|M\.P\.A|M\.PA|M\.P\.P|MPP|M\.Phil|M\.P\.h\.|B\.A|S\.E|S\.Pd|S\s*Pd|S\.P\.d|M\.P\.d|M\.Pd|M\.Sc|M\.S|M\.B\.A|MBA|M\.C\.S|MCS|M\.Pol\.Admin|M\s*Pol\s*Admin|S\.H|S\s*H|S\.Sos|S\s*Sos|I\.S|I\s*S|IMAS|I\.M\.A\.S|I\s*M\s*A\s*S)\.?\b'
    name = re.sub(degree_pattern, '', name, flags=re.IGNORECASE)
    
    # 6. Final cleanup of spaces and leading/trailing punctuation
    name = name.replace('.', ' ').replace('-', ' ')
    name = re.sub(r'\s+', ' ', name).strip(" -_.,;*\"'()\\/[]{}#")
    
    # 7. Check against IGNORE_DEGREES_NO_SPACES
    name_lower = name.lower()
    name_no_spaces = name_lower.replace(" ", "")
    if name_no_spaces in IGNORE_DEGREES_NO_SPACES or len(name) < 2 or not re.search(r'[a-zA-Z]', name):
        return ""
        
    return name

def clean_name_simple(name):
    name = clean_academic_title(name).lower()
    return name

def is_valid_author_match(raw_name, researcher_name, researcher_id):
    raw_clean = clean_name_simple(raw_name)
    res_clean = clean_name_simple(researcher_name)
    
    raw_words = [w for w in raw_clean.split() if len(w) > 1]
    res_words = [w for w in res_clean.split() if len(w) > 1]
    
    if not raw_words or not res_words:
        return True
        
    # Check if researcher is one of the 18 single-word names
    if researcher_id in SINGLE_WORD_RESEARCHERS:
        single_word = SINGLE_WORD_RESEARCHERS[researcher_id]
        
        if single_word not in raw_clean:
            return False
            
        if researcher_id == '6aada4ea-9dba-4023-8db6-48ccc75667db': # Dafri -> Dafri Agussalim
            if 'agussalim' in raw_clean: return True
        if researcher_id == '90f6f96f-f746-4a90-a7fb-d075ded0cd03': # Mulyadi -> Mulyadi Sumarto
            if 'sumarto' in raw_clean: return True
            
        # Ignore titles and degrees from raw name words list
        for w in raw_words:
            if w != single_word and w not in ('dan', 's', 'r', 'm', 'soc', 'sc', 'sci', 'msc', 'prof', 'dr', 'ma', 'msi', 'sip', 'su', 'murp', 'ssi', 'mdp', 'mlitt', 'mmktgcomm', 'st', 'mia', 'rerpol', 'mpubpol', 'phil', 'spsi', 'mes', 'sh', 'ssos', 'is', 'mpol', 'admin'):
                return False
        return True
        
    res_sig_words = [w for w in res_words if len(w) > 2]
    raw_sig_words = [w for w in raw_words if len(w) > 2]
    
    if res_sig_words and raw_sig_words:
        intersection = set(res_sig_words).intersection(set(raw_sig_words))
        if not intersection:
            return False
            
    return True

def split_and_clean_authors(author_str):
    if not author_str or not isinstance(author_str, str):
        return []
        
    initial_tokens = split_merged_names(author_str)
    
    final_tokens = []
    for token in initial_tokens:
        tokens = re.split(r'[;|]', token)
        for tok in tokens:
            sub_tokens = re.split(r'\b(and|dan|&)\b', tok, flags=re.IGNORECASE)
            for sub in sub_tokens:
                sub_clean = sub.strip()
                if sub_clean and sub_clean.lower() not in ('and', 'dan', '&'):
                    final_tokens.append(sub_clean)
                
    cleaned_authors = []
    for token in final_tokens:
        cleaned = clean_academic_title(token)
        if cleaned:
            cleaned_no_spaces = cleaned.lower().replace(" ", "")
            if cleaned_no_spaces not in IGNORE_DEGREES_NO_SPACES:
                cleaned_authors.append(cleaned)
                
    return cleaned_authors

def parse_keywords(kw_str):
    if not kw_str or not isinstance(kw_str, str) or kw_str.lower() in ('nan', 'none', 'null', ''):
        return []
    tokens = re.split(r'[,;|\n]', kw_str)
    cleaned = []
    for t in tokens:
        cleaned_token = t.strip().lower()
        if cleaned_token and cleaned_token not in ('nan', 'none', '-'):
            cleaned_token = re.sub(r'^[\'"]|[\'"]$', '', cleaned_token).strip()
            if cleaned_token and len(cleaned_token) > 1:
                cleaned.append(cleaned_token)
    return list(dict.fromkeys(cleaned))

def parse_sdgs(sdg_str):
    if not sdg_str or not isinstance(sdg_str, str) or sdg_str.lower() in ('nan', 'none', 'null', ''):
        return []
    numbers = re.findall(r'sdg\s*(\d+)', sdg_str, flags=re.IGNORECASE)
    if not numbers:
        numbers = re.findall(r'\b(\d+)\b', sdg_str)
    return sorted(list(set(int(n) for n in numbers if 1 <= int(n) <= 17)))

def truncate_abstract(abs_str):
    if not abs_str or not isinstance(abs_str, str) or abs_str.lower() in ('nan', 'none', 'null', ''):
        return ""
    abs_str = abs_str.strip()
    if len(abs_str) > 200:
        return abs_str[:200] + "..."
    return abs_str

# --- ENTITY RESOLUTION: INITIALS TO FULLNAME ---
def build_fullname_registry(researchers_db_path):
    print("Building Full Name Registry for Initials Matching...")
    registry = {}
    
    if os.path.exists(researchers_db_path):
        conn = sqlite3.connect(researchers_db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM researchers;")
        for row in cursor.fetchall():
            clean_name = clean_academic_title(row[0])
            if clean_name:
                add_to_registry(registry, clean_name)
        conn.close()
        
    return registry

def add_to_registry(registry, fullname):
    words = fullname.split()
    if len(words) < 2:
        return
        
    last_word = words[-1].lower()
    registry.setdefault(last_word, []).append(fullname)

def resolve_initials_to_fullname(name, registry):
    name_clean = clean_academic_title(name)
    words = name_clean.split()
    
    if len(words) < 2:
        return name_clean
        
    last_word = words[-1].lower()
    first_words = words[:-1]
    
    is_scopus_initials = all(len(w) <= 2 for w in first_words)
    
    if is_scopus_initials and last_word in registry:
        candidates = registry[last_word]
        for cand in candidates:
            cand_words = cand.split()
            cand_first_words = cand_words[:-1]
            
            if len(first_words) <= len(cand_first_words):
                match = True
                for i, init_token in enumerate(first_words):
                    initial_letter = init_token[0].lower()
                    candidate_letter = cand_first_words[i][0].lower()
                    if initial_letter != candidate_letter:
                        match = False
                        break
                if match:
                    return cand
                    
    return name_clean

# --- DATABASE LOADERS ---

def load_etd(registry):
    print("Loading ETD publications...")
    db_path = r"E:\ETD\etd.repository.ugm.ac.id\etd_fisipol.db"
    if not os.path.exists(db_path):
        return []
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    query = """
        SELECT 
            e.id, 
            e.judul, 
            e.nama_pengarang, 
            e.tahun, 
            e.tipe_dokumen, 
            e.departemen, 
            e.kata_kunci, 
            e.abstrak, 
            e.sdg, 
            e.link_etd
        FROM etd e;
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    
    cursor.execute("SELECT etd_id, nama FROM pembimbing;")
    pembimbing_rows = cursor.fetchall()
    pembimbing_map = {}
    for etd_id, name in pembimbing_rows:
        if name and name.strip():
            cleaned_list = split_and_clean_authors(name)
            pembimbing_map.setdefault(etd_id, []).extend(cleaned_list)
            
    unified = []
    for r in rows:
        eid, title, author, year, doc_type, dept, keywords_str, abstract, sdg_str, link = r
        
        main_author_list = split_and_clean_authors(author)
        if not main_author_list:
            continue
            
        pembimbing_list = pembimbing_map.get(eid, [])
        all_authors = main_author_list + pembimbing_list
        all_authors = [a for a in all_authors if a]
        
        all_authors = [resolve_initials_to_fullname(a, registry) for a in all_authors]
        all_authors = [a for a in all_authors if a.lower().replace(" ", "") not in IGNORE_DEGREES_NO_SPACES]
        
        # Deduplicate
        all_authors = list(dict.fromkeys(all_authors))
        if not all_authors:
            continue
            
        dept_clean = dept.strip().lower() if dept else ""
        dept_mapped = DEPT_MAPPING.get(dept_clean, "")
        departments = [dept_mapped] if dept_mapped else []
        
        kws = parse_keywords(keywords_str)
        sdgs = parse_sdgs(sdg_str)
        
        try:
            year_int = int(year) if year else 2024
        except ValueError:
            year_int = 2024
            
        if year_int < 1950 or year_int > 2027:
            continue
            
        # Standardize document type for ETD Sub-items: Skripsi, Tesis, Disertasi
        standard_doc_type = "Skripsi"
        dt_lower = doc_type.lower() if doc_type else ""
        if "tesis" in dt_lower or "master" in dt_lower:
            standard_doc_type = "Tesis"
        elif "disertasi" in dt_lower or "doktor" in dt_lower or "phd" in dt_lower or "ph.d" in dt_lower:
            standard_doc_type = "Disertasi"
            
        unified.append({
            'id': f"etd_{eid}",
            'source': 'etd',
            'title': title.strip() if title else "Untitled",
            'authors': all_authors,
            'year': year_int,
            'type': standard_doc_type, # Standardized
            'departments': departments,
            'keywords': kws,
            'abstract': truncate_abstract(abstract),
            'publisher': "ETD UGM",
            'link': link if link else "",
            'sdgs': sdgs,
            'sentiment': 'netral',
            'countries': ['Indonesia'], # ETD is always Indonesia
            'institutions': ['Universitas Gadjah Mada']
        })
        
    conn.close()
    print(f"Loaded {len(unified)} ETD publications.")
    return unified

def load_sivitas(registry):
    print("Loading Sivitas FISIPOL publications...")
    db_path = r"E:\Project\fisipol-hub-backend\fisipol_hub.db"
    if not os.path.exists(db_path):
        return []
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    query = """
        SELECT 
            p.id, 
            p.title, 
            p.year, 
            p.document_type,
            p.source_title,
            p.publisher, 
            p.abstract, 
            p.keywords, 
            p.sdgs, 
            p.link
        FROM publications p;
    """
    cursor.execute(query)
    pub_rows = cursor.fetchall()
    
    # Query affiliations raw and collaborator / affiliation details
    cursor.execute("""
        SELECT 
            pa.publication_id, 
            pa.author_name_raw, 
            r.name as researcher_name, 
            d.name as department_name,
            pa.is_fisipol,
            pa.researcher_id,
            pa.affiliation_raw,
            c.country as collaborator_country,
            a.country as affiliation_country,
            a.name as affiliation_name
        FROM publication_authors pa
        LEFT JOIN researchers r ON pa.researcher_id = r.id
        LEFT JOIN departments d ON r.department_id = d.id
        LEFT JOIN collaborators c ON pa.author_name_raw = c.name
        LEFT JOIN affiliations a ON pa.affiliation_raw = a.name;
    """)
    author_rows = cursor.fetchall()
    
    author_map = {}
    dept_map = {}
    countries_map = {}
    institutions_map = {}
    
    for pub_id, raw_name, res_name, dept_name, is_fisipol, res_id, affil_raw, c_country, a_country, a_name in author_rows:
        is_valid = True
        if res_id and res_name:
            is_valid = is_valid_author_match(raw_name, res_name, res_id)
            
        if is_valid and res_name:
            name_clean_list = [clean_academic_title(res_name)]
            if is_fisipol and dept_name:
                dept_clean = dept_name.strip().lower()
                dept_mapped = DEPT_MAPPING.get(dept_clean, dept_name)
                dept_map.setdefault(pub_id, []).append(dept_mapped)
        else:
            name_clean_list = split_and_clean_authors(raw_name)
            
        for name_clean in name_clean_list:
            if name_clean and name_clean.lower().replace(" ", "") not in IGNORE_DEGREES_NO_SPACES:
                author_map.setdefault(pub_id, []).append(name_clean)
                
        # Extract collaboration details
        countries = []
        institutions = []
        
        # 1. Add direct countries
        if c_country: countries.append(c_country)
        if a_country: countries.append(a_country)
        if a_name: institutions.append(a_name)
        
        # 2. Extract from raw string if present
        if affil_raw:
            parsed_countries, parsed_insts = extract_countries_institutions(affil_raw)
            countries.extend(parsed_countries)
            institutions.extend(parsed_insts)
            
        # Ensure UGM is always present for FISIPOL papers
        countries.append('Indonesia')
        institutions.append('Universitas Gadjah Mada')
        
        countries = [c for c in countries if c]
        institutions = [i for i in institutions if i]
        
        countries_map.setdefault(pub_id, []).extend(countries)
        institutions_map.setdefault(pub_id, []).extend(institutions)
            
    unified = []
    for r in pub_rows:
        pid, title, year, doc_type, source_title, publisher, abstract, keywords_str, sdg_str, link = r
        
        authors = author_map.get(pid, [])
        if not authors:
            continue
            
        authors = [resolve_initials_to_fullname(a, registry) for a in authors]
        authors = [a for a in authors if a and a.lower().replace(" ", "") not in IGNORE_DEGREES_NO_SPACES]
        
        authors = list(dict.fromkeys(authors))
        if not authors:
            continue
        
        depts = list(set(dept_map.get(pid, [])))
        kws = parse_keywords(keywords_str)
        sdgs = parse_sdgs(sdg_str)
        
        # Unique countries and institutions
        countries = list(dict.fromkeys(countries_map.get(pid, ['Indonesia'])))
        institutions = list(dict.fromkeys(institutions_map.get(pid, ['Universitas Gadjah Mada'])))
        
        try:
            year_int = int(year) if year else 2024
        except ValueError:
            year_int = 2024
            
        if year_int < 1950 or year_int > 2027:
            continue
            
        pub_source = source_title if source_title else (publisher if publisher else "Sivitas FISIPOL")
        
        unified.append({
            'id': f"sivitas_{pid}",
            'source': 'sivitas',
            'title': title.strip() if title else "Untitled",
            'authors': authors,
            'year': year_int,
            'type': doc_type if doc_type else "Publication",
            'departments': depts,
            'keywords': kws,
            'abstract': truncate_abstract(abstract),
            'publisher': pub_source,
            'link': link if link else "",
            'sdgs': sdgs,
            'sentiment': 'netral',
            'countries': countries,
            'institutions': institutions
        })
        
    conn.close()
    print(f"Loaded {len(unified)} Sivitas publications.")
    return unified

def load_koran_excel(registry):
    excel_path = r"C:\Users\digilib\Downloads\Daftar Digitasi Koran DIGILIB FISIPOL UGM__.xlsx"
    print("Loading Koran Digital from Excel...")
    if not os.path.exists(excel_path):
        return []
        
    try:
        df = pd.read_excel(excel_path, sheet_name='2024', header=2)
        df = df.dropna(subset=['Judul Artikel'])
        
        unified = []
        for idx, row in df.iterrows():
            title = str(row['Judul Artikel']).strip()
            publisher = str(row['Nama Koran']).strip() if pd.notna(row['Nama Koran']) else "Unknown Koran"
            
            kws = parse_keywords(str(row['Kata Kunci']) if pd.notna(row['Kata Kunci']) else "")
            link = str(row['Link Dokumen']).strip() if pd.notna(row['Link Dokumen']) else ""
            
            try:
                year = int(row['Tahun']) if pd.notna(row['Tahun']) else 2024
            except ValueError:
                year = 2024
                
            if year < 1950 or year > 2027:
                continue
                
            authors = ["Redaksi " + publisher]
            
            # Map Koran Topic
            topic = "Sosial Politik"
            if len(kws) > 0:
                # Find if any keyword matches a set of standard topics
                for kw in kws:
                    if kw.capitalize() in ("Nasional", "Sosial Politik", "Internasional", "Hukum", "Ekonomi", "Teknologi", "Daerah", "Budaya", "Entertainment"):
                        topic = kw.capitalize()
                        break
            
            unified.append({
                'id': f"koran_xl_{idx}",
                'source': 'koran',
                'title': title,
                'authors': authors,
                'year': year,
                'type': 'Newspaper',
                'departments': [],
                'keywords': kws,
                'abstract': "",
                'publisher': publisher,
                'link': link,
                'sdgs': [],
                'sentiment': 'netral',
                'topic': topic
            })
        print(f"Loaded {len(unified)} Koran articles from Excel.")
        return unified
    except Exception as e:
        print(f"Error loading Koran Excel: {e}")
        return []

def load_koran_folder(registry):
    directory = r"E:\DISKA UGM\DIGILIB\05 - Archives\2025\Article Most Popular Topic"
    print(f"Loading Koran Digital folder files from {directory}...")
    if not os.path.exists(directory):
        return []
        
    files = []
    for root, dirs, filenames in os.walk(directory):
        for f in filenames:
            if f.endswith(('.csv', '.xlsx')):
                files.append(os.path.join(root, f))
                
    unified_koran = []
    unified_sivitas = []
    count_k = 0
    count_s = 0
    
    for fp in files:
        rel = os.path.relpath(fp, directory)
        topic = os.path.basename(os.path.dirname(fp))
        
        # Standardize topic names
        standard_topic = "Sosial Politik"
        t_lower = topic.lower()
        if "cyber" in t_lower or "roblox" in t_lower or "game" in t_lower or "teknologi" in t_lower:
            standard_topic = "Teknologi"
        elif "royalti" in t_lower or "ekonomi" in t_lower or "tariff" in t_lower or "pajak" in t_lower:
            standard_topic = "Ekonomi"
        elif "hukum" in t_lower or "uu" in t_lower or "politik" in t_lower:
            standard_topic = "Sosial Politik"
        elif "daerah" in t_lower or "desentralisasi" in t_lower:
            standard_topic = "Daerah"
        elif "internasional" in t_lower or "global" in t_lower:
            standard_topic = "Internasional"
        elif "budaya" in t_lower or "nasional" in t_lower or "entertaiment" in t_lower:
            standard_topic = topic.capitalize()
            
        try:
            if fp.endswith('.csv'):
                try:
                    df = pd.read_csv(fp)
                except UnicodeDecodeError:
                    df = pd.read_csv(fp, encoding='latin1')
            else:
                df = pd.read_excel(fp)
                
            cols_lower = {c: c.lower().strip() for c in df.columns}
            df_renamed = df.rename(columns=cols_lower)
            
            # Identify file type: Scopus Export vs News Digitations
            is_scopus = any(c in df_renamed.columns for c in ['doi', 'document type', 'affiliations', 'authors with affiliations', 'eid', 'volume', 'issue'])
            
            for idx, row in df_renamed.iterrows():
                title = ""
                for col in ['judul', 'title', 'judul artikel']:
                    if col in row and pd.notna(row[col]):
                        title = str(row[col]).strip()
                        break
                if not title:
                    continue
                    
                authors = []
                for col in ['nama', 'authors', 'penulis / redaksi', 'author full names']:
                    if col in row and pd.notna(row[col]):
                        raw_authors = str(row[col])
                        cleaned_list = split_and_clean_authors(raw_authors)
                        authors.extend(cleaned_list)
                        break
                        
                authors = [resolve_initials_to_fullname(a, registry) for a in authors]
                authors = [a for a in authors if a and a.lower().replace(" ", "") not in IGNORE_DEGREES_NO_SPACES]
                
                authors = list(dict.fromkeys(authors))
                
                publisher = "Unknown"
                for col in ['publisher', 'source title', 'nama koran', 'source']:
                    if col in row and pd.notna(row[col]):
                        publisher = str(row[col]).strip()
                        break
                if publisher == "Unknown":
                    publisher = topic
                    
                keywords_str = ""
                for col in ['keyword', 'keywords', 'kata kunci', 'topik', 'author keywords', 'index keywords']:
                    if col in row and pd.notna(row[col]):
                        keywords_str += " " + str(row[col])
                kws = parse_keywords(keywords_str)
                if topic.lower() not in kws:
                    kws.append(topic.lower())
                    
                abstract = ""
                for col in ['abstrak', 'abstract']:
                    if col in row and pd.notna(row[col]):
                        abstract = str(row[col]).strip()
                        break
                        
                link = ""
                for col in ['link', 'link dokumen']:
                    if col in row and pd.notna(row[col]):
                        link = str(row[col]).strip()
                        break
                        
                sentiment = "netral"
                for col in ['sentiment', 'sentimen']:
                    if col in row and pd.notna(row[col]):
                        sentiment = str(row[col]).strip().lower()
                        if sentiment in ('positif', 'positive', 'pos'):
                            sentiment = 'positif'
                        elif sentiment in ('negatif', 'negative', 'neg'):
                            sentiment = 'negatif'
                        else:
                            sentiment = 'netral'
                        break
                        
                year = 2025
                for col in ['tahun', 'year', 'tahun upload']:
                    if col in row and pd.notna(row[col]):
                        try:
                            year = int(row[col])
                        except ValueError:
                            pass
                        break
                        
                if year < 1950 or year > 2027:
                    continue
                        
                # Extract affiliation details for Scopus files
                countries = ['Indonesia']
                institutions = ['Universitas Gadjah Mada']
                if is_scopus and 'affiliations' in row and pd.notna(row['affiliations']):
                    parsed_countries, parsed_insts = extract_countries_institutions(str(row['affiliations']))
                    countries.extend(parsed_countries)
                    institutions.extend(parsed_insts)
                countries = list(dict.fromkeys(countries))
                institutions = list(dict.fromkeys(institutions))
                
                if is_scopus:
                    count_s += 1
                    if not authors:
                        authors = ["Unknown Author"]
                    unified_sivitas.append({
                        'id': f"koran_scopus_{topic.lower()}_{count_s}",
                        'source': 'sivitas', # Academic Publication!
                        'title': title,
                        'authors': authors,
                        'year': year,
                        'type': 'Publication',
                        'departments': [],
                        'keywords': kws,
                        'abstract': truncate_abstract(abstract),
                        'publisher': publisher,
                        'link': link,
                        'sdgs': [],
                        'sentiment': 'netral',
                        'countries': countries,
                        'institutions': institutions
                    })
                else:
                    count_k += 1
                    if not authors:
                        authors = ["Redaksi " + publisher]
                    unified_koran.append({
                        'id': f"koran_fold_{topic.lower()}_{count_k}",
                        'source': 'koran', # Newspaper Article!
                        'title': title,
                        'authors': authors,
                        'year': year,
                        'type': 'Newspaper',
                        'departments': [],
                        'keywords': kws,
                        'abstract': truncate_abstract(abstract),
                        'publisher': publisher,
                        'link': link,
                        'sdgs': [],
                        'sentiment': sentiment,
                        'topic': standard_topic # Standardized Topic
                    })
        except Exception as e:
            print(f"Error parsing file {rel}: {e}")
            
    print(f"Loaded {len(unified_koran)} Newspaper articles and {len(unified_sivitas)} Academic papers from archives folder.")
    return unified_koran + unified_sivitas

def main():
    hub_db_path = r"E:\Project\fisipol-hub-backend\fisipol_hub.db"
    registry = build_fullname_registry(hub_db_path)
    
    etd_data = load_etd(registry)
    sivitas_data = load_sivitas(registry)
    
    # load_koran_folder returns a combined list of newspaper and academic records
    koran_fold_combined = load_koran_folder(registry)
    koran_xl_data = load_koran_excel(registry)
    
    all_data = etd_data + sivitas_data + koran_xl_data + koran_fold_combined
    
    seen_titles = {}
    for item in all_data:
        title_norm = re.sub(r'\s+', ' ', item['title'].lower().strip())
        if title_norm in seen_titles:
            existing = seen_titles[title_norm]
            info_existing = len(existing.get('abstract', '')) + len(existing.get('keywords', []))
            info_current = len(item.get('abstract', '')) + len(item.get('keywords', []))
            if info_current > info_existing:
                seen_titles[title_norm] = item
        else:
            seen_titles[title_norm] = item
            
    deduped_data = list(seen_titles.values())
    
    print(f"\nTotal raw records: {len(all_data)}")
    print(f"Total deduplicated records: {len(deduped_data)}")
    
    output_path = os.path.join('data', 'unified_publications.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(deduped_data, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully exported to {output_path}")

if __name__ == '__main__':
    main()
