import { Link, useLocation } from "wouter";
import { Database, MessageSquare, History, Heart, Share, Server, BarChart, Settings, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navigationItems = [
  { path: "/", label: "SQL 에이전트", icon: MessageSquare },
  // { path: "/visualization", label: "데이터 시각화", icon: BarChart },
  { path: "/sql-formatter", label: "SQL Formatter", icon: Code2  },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col transition-colors duration-300 h-screen">
      {/* Logo & Header */}
      <div className="p-4 border-b border-border h-16 flex items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">SQL Assistant</h1>
            <p className="text-xs text-muted-foreground">AI SQL Agent</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className="w-full justify-start space-x-3"
                  size="sm"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>

      </nav>
    </div>
  );
}
