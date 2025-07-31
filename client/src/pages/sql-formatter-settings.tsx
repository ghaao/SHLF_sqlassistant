import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Download, Upload, RefreshCw, Code2, Settings, Palette, Save, RotateCcw, FileText, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SQLCodeBlock from "@/components/query/sql-code-block";
import { formatSQL, getFormattingOptions, saveFormattingOptions, renderColoredSQL } from "@/lib/sqlFormatter";

const KEYWORD_CASE_OPTIONS = [
  { value: "upper", label: "대문자" },
  { value: "lower", label: "소문자" },
  { value: "capitalize", label: "첫글자 대문자" },
];

const COMMA_POSITION_OPTIONS = [
  { value: "after", label: "콤마 뒤 (a, b, c)" },
  { value: "before", label: "콤마 앞 (a ,b ,c)" },
  { value: "line-after", label: "줄 끝 (a,\nb,\nc)" },
  { value: "line-before", label: "줄 시작 (a\n,b\n,c)" },
];

const KEYWORD_COLORS = {
  select: "#0066cc", from: "#008000", where: "#800080", join: "#cc6600",
  order: "#cc0000", group: "#990099", having: "#006666", insert: "#b30000",
  update: "#b30000", delete: "#b30000", create: "#004d99", alter: "#004d99", drop: "#b30000"
};

const COLOR_THEMES = [
  { name: "기본 테마", colors: KEYWORD_COLORS },
  {
    name: "다크 테마",
    colors: {
      select: "#4da6ff", from: "#66b366", where: "#b366b3", join: "#ff9933",
      order: "#ff4d4d", group: "#cc66cc", having: "#4dcccc", insert: "#ff6666",
      update: "#ff6666", delete: "#ff6666", create: "#6699ff", alter: "#6699ff", drop: "#ff6666"
    }
  },
  {
    name: "파스텔 테마",
    colors: {
      select: "#87ceeb", from: "#98fb98", where: "#dda0dd", join: "#f4a460",
      order: "#fa8072", group: "#dda0dd", having: "#afeeee", insert: "#ffa07a",
      update: "#ffa07a", delete: "#ffa07a", create: "#87cefa", alter: "#87cefa", drop: "#ffa07a"
    }
  },
  {
    name: "모노크롬",
    colors: {
      select: "#2c3e50", from: "#34495e", where: "#7f8c8d", join: "#95a5a6",
      order: "#bdc3c7", group: "#ecf0f1", having: "#2c3e50", insert: "#34495e",
      update: "#34495e", delete: "#34495e", create: "#2c3e50", alter: "#2c3e50", drop: "#34495e"
    }
  }
];

const SAMPLE_SQL_PREVIEW = `SELECT u.user_id, u.user_name, COUNT(o.order_id) AS order_count, SUM(o.total_amount) AS total_spent FROM users u LEFT JOIN orders o ON u.user_id = o.user_id WHERE u.created_date >= DATE '2023-01-01' AND u.status = 'ACTIVE' GROUP BY u.user_id, u.user_name HAVING COUNT(o.order_id) > 0 ORDER BY total_spent DESC LIMIT 10;`;

const PRESET_STYLES = [
  {
    name: "Oracle 스타일",
    settings: {
      keywordCase: "upper", commaPosition: "after", indentSize: 2,
      addLineBreaks: true, addSpacing: true, colorKeywords: true,
      alignColumns: true, uppercaseDataTypes: true,
    }
  },
  {
    name: "PostgreSQL 스타일",
    settings: {
      keywordCase: "lower", commaPosition: "line-before", indentSize: 4,
      addLineBreaks: true, addSpacing: true, colorKeywords: true,
      alignColumns: false, uppercaseDataTypes: false,
    }
  },
  {
    name: "압축 스타일",
    settings: {
      keywordCase: "upper", commaPosition: "after", indentSize: 1,
      addLineBreaks: false, addSpacing: false, colorKeywords: false,
      alignColumns: false, uppercaseDataTypes: true,
    }
  }
];

const SAMPLE_SQL = `SELECT u.user_id, u.user_name, COUNT(o.order_id) as order_count, SUM(o.total_amount) as total_spent FROM users u LEFT JOIN orders o ON u.user_id = o.user_id WHERE u.created_date >= DATE '2023-01-01' AND u.status = 'ACTIVE' GROUP BY u.user_id, u.user_name HAVING COUNT(o.order_id) > 0 ORDER BY total_spent DESC FETCH FIRST 10 ROWS ONLY;`;

export default function SQLFormatterSettingsPage() {
  const [inputSQL, setInputSQL] = useState("");
  const [formattedSQL, setFormattedSQL] = useState("");
  const [selectedDialect, setSelectedDialect] = useState("oracle");
  const [formattingStyle, setFormattingStyle] = useState("standard");
  const [isFormatting, setIsFormatting] = useState(false);
  const [isFormatterDialogOpen, setIsFormatterDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const [formattingOptions, setFormattingOptions] = useState(() => getFormattingOptions());
  const [originalOptions, setOriginalOptions] = useState(formattingOptions);

  useEffect(() => {
    saveFormattingOptions(formattingOptions);
  }, [formattingOptions]);

  useEffect(() => {
    const hasChanges = JSON.stringify(formattingOptions) !== JSON.stringify(originalOptions);
    setHasUnsavedChanges(hasChanges);
  }, [formattingOptions, originalOptions]);

  const handleFormatSQL = async () => {
    if (!inputSQL.trim()) {
      toast({
        title: "오류",
        description: "포맷팅할 SQL을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsFormatting(true);

    try {
      const response = await fetch('/api/format-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: inputSQL }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '알 수 없는 오류가 발생했습니다.');
      }
      
      setFormattedSQL(result.formattedSql);
      toast({
        title: "성공",
        description: "SQL 포맷팅이 완료되었습니다.",
      });

    } catch (error: any) {
      setFormattedSQL("");
      toast({
        title: "포맷팅 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFormatting(false);
    }
  };

  const handleCopyFormatted = () => {
    if (formattedSQL) {
      navigator.clipboard.writeText(formattedSQL);
      toast({
        title: "Copied",
        description: "Formatted SQL copied to clipboard",
      });
    }
  };

  const handleDownloadSQL = () => {
    if (formattedSQL) {
      const blob = new Blob([formattedSQL], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formatted_query_${selectedDialect}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded",
        description: "SQL file downloaded successfully",
      });
    }
  };

  const handleLoadSample = () => {
    setInputSQL(SAMPLE_SQL);
    toast({
      title: "Sample Loaded",
      description: "Sample SQL query loaded for formatting",
    });
  };

  const handleClearAll = () => {
    setInputSQL("");
    setFormattedSQL("");
    toast({
      title: "내용 지움",
      description: "모든 내용이 지워졌습니다",
    });
  };

  const handleSaveSettings = () => {
    try {
      saveFormattingOptions(formattingOptions);
      setOriginalOptions(formattingOptions);
      setHasUnsavedChanges(false);
      toast({
        title: "설정 저장됨",
        description: "SQL 포맷팅 설정이 저장되었습니다",
      });
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "설정 저장 중 오류가 발생했습니다",
        variant: "destructive",
      });
    }
  };

  const handleResetSettings = () => {
    const defaultSettings = getFormattingOptions(); // Get defaults from the central function
    setFormattingOptions(defaultSettings);
    toast({
      title: "설정 초기화",
      description: "모든 설정이 기본값으로 초기화되었습니다",
    });
  };

  const handleApplyPreset = (preset: typeof PRESET_STYLES[0]) => {
    setFormattingOptions(prev => ({
      ...prev,
      ...preset.settings,
    }));
    toast({
      title: "프리셋 적용",
      description: `${preset.name} 설정이 적용되었습니다`,
    });
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">SQL 포맷팅 설정</h1>
              <p className="text-muted-foreground">
                시스템 전체에 적용될 SQL 포맷팅 규칙을 설정하고 관리하세요.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  저장되지 않은 변경사항
                </Badge>
              )}
              <Dialog open={isFormatterDialogOpen} onOpenChange={setIsFormatterDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    SQL 포맷팅 테스트
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>SQL 포맷팅 테스트</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">테스트할 SQL 입력</Label>
                      <Textarea
                        placeholder="포맷팅을 테스트할 SQL 쿼리를 입력하세요..."
                        value={inputSQL}
                        onChange={(e) => setInputSQL(e.target.value)}
                        className="min-h-[200px] font-mono text-sm mt-1"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleFormatSQL}
                        disabled={isFormatting}
                      >
                        {isFormatting ? (
                          <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />포맷팅 중...</>
                        ) : (
                          <><Wand2 className="w-4 h-4 mr-2" />포맷팅 적용</>
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleLoadSample}>
                        <Upload className="w-4 h-4 mr-2" />샘플 로드
                      </Button>
                      <Button variant="outline" onClick={handleClearAll}>지우기</Button>
                    </div>
                    {formattedSQL && (
                      <div>
                        <Label className="text-sm font-medium">포맷된 결과</Label>
                        <div className="bg-muted/20 p-4 rounded-lg max-h-[400px] overflow-y-auto mt-1">
                          {formattingOptions.colorKeywords ? (
                            <div className="font-mono text-sm whitespace-pre-wrap">
                              {renderColoredSQL(formattedSQL, formattingOptions.keywordColors)}
                            </div>
                          ) : (
                            <SQLCodeBlock
                              sqlQuery={formattedSQL}
                              dialect={selectedDialect}
                            />
                          )}
                        </div>
                        <div className="flex space-x-2 mt-2">
                          <Button variant="outline" onClick={handleCopyFormatted} size="sm">
                            <Copy className="w-4 h-4 mr-2" />복사
                          </Button>
                          <Button variant="outline" onClick={handleDownloadSQL} size="sm">
                            <Download className="w-4 h-4 mr-2" />다운로드
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2"><Settings className="w-5 h-5" /><span>기본 설정</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">예약어 대소문자</Label>
                    <Select 
                      value={formattingOptions.keywordCase} 
                      onValueChange={(value) => setFormattingOptions(prev => ({ ...prev, keywordCase: value }))}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KEYWORD_CASE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">콤마 위치</Label>
                    <Select 
                      value={formattingOptions.commaPosition} 
                      onValueChange={(value) => setFormattingOptions(prev => ({ ...prev, commaPosition: value }))}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMMA_POSITION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">들여쓰기: {formattingOptions.indentSize}칸</Label>
                    <Slider
                      value={[formattingOptions.indentSize]}
                      onValueChange={(value) => setFormattingOptions(prev => ({ ...prev, indentSize: value[0] }))}
                      min={1} max={8} step={1} className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">최대 줄 길이: {formattingOptions.maxLineLength}자</Label>
                    <Slider
                      value={[formattingOptions.maxLineLength]}
                      onValueChange={(value) => setFormattingOptions(prev => ({ ...prev, maxLineLength: value[0] }))}
                      min={40} max={200} step={10} className="mt-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch checked={formattingOptions.addLineBreaks} onCheckedChange={(checked) => setFormattingOptions(prev => ({ ...prev, addLineBreaks: checked }))} />
                    <Label className="text-sm">줄바꿈</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={formattingOptions.addSpacing} onCheckedChange={(checked) => setFormattingOptions(prev => ({ ...prev, addSpacing: checked }))} />
                    <Label className="text-sm">띄어쓰기</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={formattingOptions.alignColumns} onCheckedChange={(checked) => setFormattingOptions(prev => ({ ...prev, alignColumns: checked }))} />
                    <Label className="text-sm">컬럼 정렬</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={formattingOptions.uppercaseDataTypes} onCheckedChange={(checked) => setFormattingOptions(prev => ({ ...prev, uppercaseDataTypes: checked }))} />
                    <Label className="text-sm">데이터 타입</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2"><Palette className="w-5 h-5" /><span>색상 설정</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">예약어 색상 표시</Label>
                  <Switch checked={formattingOptions.colorKeywords} onCheckedChange={(checked) => setFormattingOptions(prev => ({ ...prev, colorKeywords: checked }))} />
                </div>
                <div>
                  <Label className="text-sm font-medium">통일 키워드 색상</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input type="color" value={formattingOptions.unifiedKeywordColor} onChange={(e) => setFormattingOptions(prev => ({ ...prev, unifiedKeywordColor: e.target.value }))} className="w-8 h-8 border rounded cursor-pointer" />
                    <span className="text-sm text-muted-foreground">{formattingOptions.unifiedKeywordColor}</span>
                  </div>
                </div>
                {formattingOptions.colorKeywords && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">색상 테마</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {COLOR_THEMES.map((theme) => (
                        <Button key={theme.name} variant="outline" size="sm" onClick={() => setFormattingOptions(prev => ({ ...prev, keywordColors: theme.colors }))} className="justify-start">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: theme.colors.select }}></div>
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: theme.colors.from }}></div>
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: theme.colors.where }}></div>
                            </div>
                            <span>{theme.name}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2"><Settings className="w-5 h-5" /><span>빠른 설정</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_STYLES.map((preset) => (
                    <Button key={preset.name} variant="outline" size="sm" onClick={() => handleApplyPreset(preset)} className="text-xs">{preset.name}</Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2"><Code2 className="w-5 h-5" /><span>실시간 미리보기</span></CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/20 p-4 rounded-lg max-h-[500px] overflow-y-auto">
                  {formattingOptions.colorKeywords ? (
                    <div className="font-mono text-sm whitespace-pre-wrap">
                      {renderColoredSQL(formatSQL(SAMPLE_SQL_PREVIEW, formattingStyle, formattingOptions), formattingOptions.keywordColors)}
                    </div>
                  ) : (
                    <SQLCodeBlock sqlQuery={formatSQL(SAMPLE_SQL_PREVIEW, formattingStyle, formattingOptions)} dialect={selectedDialect} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-medium">설정 관리</h3>
                <p className="text-sm text-muted-foreground">변경사항을 저장하거나 기본값으로 초기화하세요.</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleResetSettings}><RotateCcw className="w-4 h-4 mr-2" />초기화</Button>
                <Button onClick={handleSaveSettings} disabled={!hasUnsavedChanges}><Save className="w-4 h-4 mr-2" />설정 저장</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}