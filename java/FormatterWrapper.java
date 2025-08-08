// backend/FormatterWrapper.java

// 실제 jar 파일의 패키지 경로에 맞게 이 부분을 수정해야 할 수 있음.
// 예: com.mycompany.sqlformatter.SQLForm 등
import SQLinForm_API.SQLForm;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class FormatterWrapper {
    public static void main(String[] args) {
        StringBuilder sqlBuilder = new StringBuilder();
        
        // 1. 터미널(표준 입력)로부터 SQL 문자열을 읽어들입니다.
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sqlBuilder.append(line).append(System.lineSeparator());
            }
        } catch (IOException e) {
            System.err.println("Error reading from stdin: " + e.getMessage());
            System.exit(1);
        }

        String unformattedSql = sqlBuilder.toString();
        if (unformattedSql.trim().isEmpty()) {
            System.err.println("Input SQL is empty.");
            System.exit(1);
        }

        try {
            // 2. 제공된 라이브러리 사용법에 따라 SQL을 포맷팅합니다.
            SQLForm niceSQL = new SQLForm();

            // SQL Input 설정
            niceSQL.setSourceSQLLanguage("Oracle");

            // 전체 대문자
            niceSQL.setCase(3);

            // Line Breaker
            niceSQL.setLinebreakKeyword(false);
            niceSQL.setLinebreakCase(true);

            niceSQL.setLinebreakBeforeComma(true);
            niceSQL.setLinebreakBeforeConcat(false);
            niceSQL.setLinebreakBeforeBlockComment(false);
            niceSQL.setLineBreakBeforeSelectBracket(false);
            niceSQL.setLineBreakBeforeConditionBracket(false);
            niceSQL.setLineBreakBeforeCloseConditionBracket(false);

            niceSQL.setLinebreakAfterComma(false);
            niceSQL.setLinebreakAfterConditionBr(false);

            niceSQL.setDoubleLinebreakUNION(false);
            niceSQL.setLinebreakCaseAndOr(false);

            // Space 설정
            niceSQL.setEqualSpaces("oneSpaceAroundEqual");
            niceSQL.setBracketSpaces("noSpacesAroundBracket");
            niceSQL.setCommaSpaces("oneSpaceAfterComma");

            // CASE 문
            niceSQL.setCASETHENIndention(true);

            // Alignment
            niceSQL.setAlignmentComma(false);
            niceSQL.setAlignmentPosition(false, 60);


            niceSQL.formatSQL(unformattedSql);
            String formattedSQL = niceSQL.getFormattedSQLinString();

            // 3. 포맷팅된 결과를 터미널(표준 출력)으로 내보냅니다.
            System.out.print(formattedSQL);
        } catch (Exception e) {
            System.err.println("Error during SQL formatting: " + e.getMessage());
            e.printStackTrace(System.err);
            System.exit(1);
        }
    }
}