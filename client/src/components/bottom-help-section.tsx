import { Link } from "wouter";
import { HelpCircle, MessageCircle, FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function BottomHelpSection() {
  return (
    <div className="mt-8 mb-24 px-4">
      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/help">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-auto p-3 flex flex-col items-center gap-2 hover:bg-background"
                data-testid="button-help-guide"
              >
                <FileText className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium text-xs">User Guide</div>
                  <div className="text-xs text-muted-foreground">How to use PlateMate</div>
                </div>
              </Button>
            </Link>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-auto p-3 flex flex-col items-center gap-2 hover:bg-background"
              onClick={() => window.open('mailto:support@platemate.app', '_blank')}
              data-testid="button-contact-support"
            >
              <MessageCircle className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium text-xs">Contact Support</div>
                <div className="text-xs text-muted-foreground">Get personalized help</div>
              </div>
            </Button>
            
            <Link href="/injection-advice">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-auto p-3 flex flex-col items-center gap-2 hover:bg-background"
                data-testid="button-medication-help"
              >
                <ExternalLink className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium text-xs">Medication Guide</div>
                  <div className="text-xs text-muted-foreground">Weight loss injections</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}