"""
Script để parse file docx câu hỏi trắc nghiệm và tạo file JSON
với cấu trúc đúng - mỗi đáp án trên một dòng riêng biệt
"""
import re
import json
from docx import Document
import os

def split_options_inline(text):
    """
    Phân tách các đáp án được viết trên cùng một dòng
    Ví dụ: "A. Đáp án 1 B. Đáp án 2 C. Đáp án 3 D. Đáp án 4"
    -> ["A. Đáp án 1", "B. Đáp án 2", "C. Đáp án 3", "D. Đáp án 4"]
    """
    # Pattern để match các đáp án bắt đầu bằng A., B., C., D. hoặc *A., *B., *C., *D.
    pattern = r'\s*\*?([A-D])\s*[\.]\s*'
    
    # Tìm tất cả các vị trí match
    matches = list(re.finditer(pattern, text))
    
    if len(matches) <= 1:
        return [text.strip()] if text.strip() else []
    
    options = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        option_text = text[start:end].strip()
        if option_text:
            options.append(option_text)
    
    return options


def parse_questions(doc_path):
    """Parse docx file và trả về list câu hỏi"""
    doc = Document(doc_path)
    
    questions = []
    current_question = None
    current_options = []
    correct_answer = None
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        
        # Bỏ qua các dòng không cần thiết
        if text.startswith('HỆ THỐNG CÂU HỎI') or text.startswith('Trang '):
            continue
        if re.match(r'^Trang\s+\d+/\d+', text):
            continue
        
        # Kiểm tra xem có phải là câu hỏi mới không
        question_match = re.match(r'^(?:///)?Câu\s*(\d+)[\.:]?\s*(.+)$', text)
        
        if question_match:
            # Lưu câu hỏi trước đó nếu có
            if current_question and current_options:
                # Xử lý và clean options
                processed_options = process_options(current_options)
                if len(processed_options) >= 2:  # Ít nhất phải có 2 đáp án
                    correct_idx = find_correct_answer(processed_options)
                    questions.append({
                        'id': len(questions) + 1,
                        'question': current_question,
                        'options': clean_options(processed_options),
                        'correctAnswer': correct_idx
                    })
            
            # Bắt đầu câu hỏi mới
            question_text = question_match.group(2).strip()
            
            # Kiểm tra xem có đáp án A. trong cùng dòng không
            option_in_question = re.search(r'\s+\*?[A-D]\s*[\.]\s+', question_text)
            if option_in_question:
                # Tách câu hỏi và đáp án
                q_part = question_text[:option_in_question.start()].strip()
                opt_part = question_text[option_in_question.start():].strip()
                current_question = q_part
                current_options = split_options_inline(opt_part)
            else:
                current_question = question_text
                current_options = []
        
        # Kiểm tra xem có phải là dòng đáp án không
        elif re.match(r'^\s*\*?[A-D]\s*[\.]\s*', text):
            # Có thể có nhiều đáp án trên cùng dòng
            inline_options = split_options_inline(text)
            current_options.extend(inline_options)
        
        # Dòng tiếp tục của đáp án trước đó
        elif current_options and not text.startswith('Câu'):
            # Nối vào đáp án cuối cùng
            if current_options:
                current_options[-1] = current_options[-1] + ' ' + text
    
    # Lưu câu hỏi cuối cùng
    if current_question and current_options:
        processed_options = process_options(current_options)
        if len(processed_options) >= 2:
            correct_idx = find_correct_answer(processed_options)
            questions.append({
                'id': len(questions) + 1,
                'question': current_question,
                'options': clean_options(processed_options),
                'correctAnswer': correct_idx
            })
    
    return questions


def process_options(options):
    """Xử lý danh sách options, đảm bảo mỗi option đều đúng format"""
    processed = []
    for opt in options:
        if not opt.strip():
            continue
        # Kiểm tra xem có nhiều option trong 1 string không
        inline = split_options_inline(opt)
        if len(inline) > 1:
            processed.extend(inline)
        else:
            processed.append(opt.strip())
    
    # Loại bỏ duplicate và sắp xếp theo A, B, C, D
    unique_options = []
    seen_letters = set()
    for opt in processed:
        match = re.match(r'^\*?([A-D])', opt)
        if match:
            letter = match.group(1)
            if letter not in seen_letters:
                seen_letters.add(letter)
                unique_options.append(opt)
    
    # Sắp xếp theo thứ tự A, B, C, D
    def sort_key(x):
        match = re.match(r'^\*?([A-D])', x)
        return match.group(1) if match else 'Z'
    
    unique_options.sort(key=sort_key)
    
    return unique_options


def find_correct_answer(options):
    """Tìm index của đáp án đúng (đánh dấu bằng * ở đầu)"""
    for i, opt in enumerate(options):
        if opt.strip().startswith('*'):
            return i
    return 0  # Mặc định là đáp án đầu tiên nếu không tìm thấy


def clean_options(options):
    """Làm sạch các option - bỏ dấu * và chuẩn hóa format"""
    cleaned = []
    for opt in options:
        # Bỏ dấu * ở đầu
        opt = re.sub(r'^\*\s*', '', opt.strip())
        # Bỏ thông tin trang
        opt = re.sub(r'\s*Trang\s+\d+/\d+\s*$', '', opt)
        cleaned.append(opt)
    return cleaned


def main():
    doc_path = os.path.join(os.path.dirname(__file__), 'chủ nghĩa.docx')
    
    print("Đang parse file docx...")
    questions = parse_questions(doc_path)
    
    print(f"Đã parse được {len(questions)} câu hỏi")
    
    # Kiểm tra các câu hỏi có vấn đề (ít hơn 4 đáp án)
    problematic = []
    for q in questions:
        if len(q['options']) != 4:
            problematic.append(q)
    
    if problematic:
        print(f"\nCảnh báo: Có {len(problematic)} câu hỏi không có đủ 4 đáp án:")
        for q in problematic[:5]:  # Chỉ show 5 câu đầu
            print(f"  Câu {q['id']}: {len(q['options'])} đáp án")
    
    # Tạo output JSON
    output = {
        'title': 'Chủ nghĩa Xã hội Khoa học',
        'subtitle': 'Hệ thống câu hỏi trắc nghiệm ôn tập',
        'totalQuestions': len(questions),
        'questions': questions
    }
    
    output_path = os.path.join(os.path.dirname(__file__), 'questions.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\nĐã lưu file JSON: {output_path}")
    
    # In ra một số câu hỏi mẫu để kiểm tra
    print("\n--- Một số câu hỏi mẫu ---")
    for q in questions[:3]:
        print(f"\nCâu {q['id']}: {q['question'][:50]}...")
        for i, opt in enumerate(q['options']):
            marker = '✓' if i == q['correctAnswer'] else ' '
            print(f"  [{marker}] {opt[:60]}...")


if __name__ == '__main__':
    main()
