import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { AssessmentQuestion } from "@shared/schema";
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  FileUpIcon,
  CheckIcon,
  ClockIcon
} from "lucide-react";

const OPERATIONAL_DOMAINS = [
  "Strategic Alignment",
  "Financial Management", 
  "Revenue Engine",
  "Operations Excellence",
  "People & Organization",
  "Technology & Data",
  "Customer Success",
  "Product Strategy",
  "Market Position",
  "Risk Management",
  "Innovation Pipeline",
  "Governance & Compliance"
];

const QUESTIONS_PER_DOMAIN = 10;

// Sample questions for each domain
const DOMAIN_QUESTIONS = {
  "Strategic Alignment": [
    "How clearly defined is your company's 3-year strategic vision?",
    "How well aligned are leadership team priorities with company strategy?",
    "How effectively does your strategy translate into operational decisions?",
    "How well do departments understand their role in achieving strategic goals?",
    "How frequently do you review and adjust strategic priorities?",
    "How well resourced are your strategic initiatives?",
    "How effectively do you communicate strategy throughout the organization?",
    "How well do you measure strategic progress?",
    "How quickly can you pivot strategy based on market changes?",
    "How confident are you in your competitive positioning?"
  ],
  "Financial Management": [
    "How predictable is your monthly cash flow?",
    "How accurate are your financial forecasts (revenue, expenses)?",
    "How well do you track and manage unit economics?",
    "How effective is your budgeting and financial planning process?",
    "How quickly can you access key financial metrics and reports?",
    "How well do you manage working capital and cash conversion?",
    "How effectively do you control and optimize costs?",
    "How well do you manage financial risk and compliance?",
    "How effectively do you use financial data for decision making?",
    "How satisfied are you with your current financial systems and tools?"
  ],
  "Revenue Engine": [
    "How predictable is your sales pipeline and conversion rates?",
    "How well defined and documented are your sales processes?",
    "How effective is your lead generation and qualification?",
    "How well do you track and optimize customer acquisition costs?",
    "How effective is your pricing strategy and value proposition?",
    "How well do you manage customer relationships and retention?",
    "How effective is your sales team performance and productivity?",
    "How well integrated are your marketing and sales efforts?",
    "How effectively do you measure and improve sales metrics?",
    "How scalable is your current revenue model?"
  ],
  "Operations Excellence": [
    "How efficient and streamlined are your core business processes?",
    "How well documented and standardized are your procedures?",
    "How effectively do you identify and eliminate process bottlenecks?",
    "How well do you measure and improve operational performance?",
    "How effective is your quality control and error management?",
    "How well do you manage supplier and vendor relationships?",
    "How effectively do you use technology to automate processes?",
    "How well do you manage operational costs and efficiency?",
    "How quickly can you scale operations to meet demand?",
    "How effective is your project and change management?"
  ],
  "People & Organization": [
    "How effectively do you recruit and onboard new talent?",
    "How well do you retain top performers and manage turnover?",
    "How clear are roles, responsibilities, and reporting structures?",
    "How effective is your performance management and feedback?",
    "How well do you develop and grow employee capabilities?",
    "How strong is your company culture and employee engagement?",
    "How effectively do you manage compensation and benefits?",
    "How well do you plan for succession and leadership development?",
    "How effectively do you manage team communication and collaboration?",
    "How prepared are you to scale your team as the company grows?"
  ],
  "Technology & Data": [
    "How well do your technology systems support business operations?",
    "How effective is your data collection, storage, and analysis?",
    "How well integrated are your various software systems?",
    "How effectively do you use data for business decision making?",
    "How robust is your cybersecurity and data protection?",
    "How well do you manage technology costs and investments?",
    "How effectively do you plan and implement technology changes?",
    "How well do you backup and protect critical business data?",
    "How scalable is your current technology infrastructure?",
    "How effectively do you train employees on technology tools?"
  ],
  "Customer Success": [
    "How well do you understand your customers' needs and satisfaction?",
    "How effectively do you onboard and support new customers?",
    "How well do you measure and improve customer experience?",
    "How effectively do you handle customer complaints and issues?",
    "How well do you retain customers and reduce churn?",
    "How effectively do you expand revenue from existing customers?",
    "How well do you collect and act on customer feedback?",
    "How effectively do you segment and target different customer groups?",
    "How well do you measure customer lifetime value and profitability?",
    "How effectively do you build long-term customer relationships?"
  ],
  "Product Strategy": [
    "How well defined is your product roadmap and development strategy?",
    "How effectively do you conduct market research and competitive analysis?",
    "How well do you prioritize product features and improvements?",
    "How effectively do you collect and incorporate user feedback?",
    "How well do you manage product development timelines and resources?",
    "How effectively do you test and validate new product ideas?",
    "How well do you measure product performance and user adoption?",
    "How effectively do you price and position your products?",
    "How well do you manage product launches and go-to-market?",
    "How effectively do you innovate and stay ahead of competition?"
  ],
  "Market Position": [
    "How well do you understand your target market and competition?",
    "How effectively do you differentiate from competitors?",
    "How strong is your brand recognition and reputation?",
    "How effectively do you communicate your value proposition?",
    "How well do you adapt to market changes and trends?",
    "How effectively do you identify new market opportunities?",
    "How well do you measure market share and competitive position?",
    "How effectively do you build strategic partnerships?",
    "How well do you manage regulatory and industry requirements?",
    "How prepared are you for market expansion or new segments?"
  ],
  "Risk Management": [
    "How well do you identify and assess business risks?",
    "How effectively do you plan for and mitigate key risks?",
    "How well do you manage financial and operational risks?",
    "How effectively do you handle crisis management and response?",
    "How well do you ensure business continuity and disaster recovery?",
    "How effectively do you manage legal and compliance risks?",
    "How well do you protect intellectual property and assets?",
    "How effectively do you manage insurance and risk transfer?",
    "How well do you monitor and report on risk factors?",
    "How prepared are you for economic downturns or disruptions?"
  ],
  "Innovation Pipeline": [
    "How effectively do you generate and evaluate new ideas?",
    "How well do you allocate resources for innovation and R&D?",
    "How effectively do you test and validate new concepts?",
    "How well do you manage innovation projects and timelines?",
    "How effectively do you encourage employee innovation and creativity?",
    "How well do you stay current with industry trends and technologies?",
    "How effectively do you partner with external innovators?",
    "How well do you protect and commercialize intellectual property?",
    "How effectively do you measure innovation ROI and success?",
    "How prepared are you to disrupt your own business model?"
  ],
  "Governance & Compliance": [
    "How well established are your governance structures and processes?",
    "How effectively do you ensure regulatory and legal compliance?",
    "How well do you manage board relations and reporting?",
    "How effectively do you handle audit and financial oversight?",
    "How well do you manage conflicts of interest and ethics?",
    "How effectively do you ensure transparency and accountability?",
    "How well do you manage stakeholder relations and communication?",
    "How effectively do you handle legal contracts and agreements?",
    "How well do you manage data privacy and protection requirements?",
    "How prepared are you for regulatory changes or investigations?"
  ]
};

interface AssessmentFormProps {
  assessmentId: string;
  onComplete: (assessmentId: string) => void;
}

export function AssessmentForm({ assessmentId, onComplete }: AssessmentFormProps) {
  const [currentDomain, setCurrentDomain] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      response: "",
      score: "",
    }
  });

  // Get current domain and question
  const domain = OPERATIONAL_DOMAINS[currentDomain];
  const questions = DOMAIN_QUESTIONS[domain as keyof typeof DOMAIN_QUESTIONS] || [];
  const question = questions[currentQuestion];
  
  // Calculate progress
  const totalQuestions = OPERATIONAL_DOMAINS.length * QUESTIONS_PER_DOMAIN;
  const currentQuestionIndex = currentDomain * QUESTIONS_PER_DOMAIN + currentQuestion;
  const progress = Math.round((currentQuestionIndex / totalQuestions) * 100);

  // Load existing response
  useEffect(() => {
    const key = `${domain}-${currentQuestion}`;
    if (responses[key]) {
      form.reset({
        response: responses[key].response || "",
        score: responses[key].score?.toString() || "",
      });
    } else {
      form.reset({ response: "", score: "" });
    }
  }, [currentDomain, currentQuestion, responses, form]);

  // Save responses mutation
  const saveResponsesMutation = useMutation({
    mutationFn: async (allResponses: any[]) => {
      return await apiRequest("POST", `/api/assessments/${assessmentId}/responses`, {
        responses: allResponses
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Responses Saved",
        description: `Progress: ${data.progress}%`,
      });
      
      if (data.progress >= 100) {
        onComplete(assessmentId);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save responses. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Document upload handlers
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: any) => {
    try {
      const uploadURL = result.successful[0]?.uploadURL;
      if (uploadURL) {
        const fileName = result.successful[0]?.name || 'document.pdf';
        const fileSize = result.successful[0]?.size || 0;
        const fileType = result.successful[0]?.type || 'application/pdf';

        await apiRequest("POST", `/api/assessments/${assessmentId}/documents`, {
          fileName,
          fileSize,
          fileType,
          uploadURL,
        });

        setUploadedDocuments(prev => [...prev, fileName]);
        toast({
          title: "Document Uploaded",
          description: `${fileName} has been uploaded successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to save document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNext = () => {
    // Save current response
    const formData = form.getValues();
    const key = `${domain}-${currentQuestion}`;
    
    setResponses(prev => ({
      ...prev,
      [key]: {
        domainName: domain,
        questionId: key,
        response: formData.response,
        score: parseInt(formData.score) || null,
      }
    }));

    // Navigate to next question
    if (currentQuestion < QUESTIONS_PER_DOMAIN - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else if (currentDomain < OPERATIONAL_DOMAINS.length - 1) {
      setCurrentDomain(prev => prev + 1);
      setCurrentQuestion(0);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    } else if (currentDomain > 0) {
      setCurrentDomain(prev => prev - 1);
      setCurrentQuestion(QUESTIONS_PER_DOMAIN - 1);
    }
  };

  const handleSubmit = () => {
    // Convert responses to array format
    const allResponses = Object.values(responses);
    saveResponsesMutation.mutate(allResponses);
  };

  const isLastQuestion = currentDomain === OPERATIONAL_DOMAINS.length - 1 && 
                        currentQuestion === QUESTIONS_PER_DOMAIN - 1;
  const isFirstQuestion = currentDomain === 0 && currentQuestion === 0;

  return (
    <div className="space-y-8">
      {/* Progress Header */}
      <Card data-testid="card-progress">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {domain} Assessment
              </h3>
              <p className="text-muted-foreground">
                Question {currentQuestion + 1} of {QUESTIONS_PER_DOMAIN}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{progress}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>
          
          <Progress value={progress} className="mb-4" />
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Domain {currentDomain + 1} of {OPERATIONAL_DOMAINS.length}
            </span>
            <span>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card data-testid="card-question">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="outline">{domain}</Badge>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <ClockIcon className="w-4 h-4" />
              <span>Est. 2-3 min</span>
            </div>
          </div>
          <CardTitle className="text-xl leading-relaxed">
            {question}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <div className="space-y-6">
              {/* Score Rating */}
              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Rate this area on a scale of 1-10
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-wrap gap-3"
                        data-testid="radio-score"
                      >
                        {[1,2,3,4,5,6,7,8,9,10].map((score) => (
                          <div key={score} className="flex items-center space-x-2">
                            <RadioGroupItem value={score.toString()} id={`score-${score}`} />
                            <label 
                              htmlFor={`score-${score}`} 
                              className="text-sm font-medium cursor-pointer"
                            >
                              {score}
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>1 = Major Issues</span>
                      <span>10 = Excellent</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Detailed Response */}
              <FormField
                control={form.control}
                name="response"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Please provide details about your current situation
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your current processes, challenges, and any relevant context..."
                        className="min-h-[120px]"
                        data-testid="textarea-response"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Document Upload */}
      {currentQuestionIndex % 20 === 10 && (
        <Card data-testid="card-document-upload">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileUpIcon className="w-5 h-5 mr-2" />
              Supporting Documents (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Upload any relevant documents that might help our AI agents better understand 
              your {domain.toLowerCase()} processes (financial reports, org charts, process docs, etc.)
            </p>
            
            <ObjectUploader
              maxNumberOfFiles={3}
              maxFileSize={10485760}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              data-testid="uploader-documents"
            >
              <div className="flex items-center gap-2">
                <FileUpIcon className="w-4 h-4" />
                <span>Upload Documents</span>
              </div>
            </ObjectUploader>

            {uploadedDocuments.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-foreground mb-2">Uploaded Documents:</p>
                <div className="space-y-1">
                  {uploadedDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center text-sm text-muted-foreground">
                      <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                      {doc}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <Card data-testid="card-navigation">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={isFirstQuestion}
              data-testid="button-previous"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {OPERATIONAL_DOMAINS.map((d, index) => (
                  <Badge 
                    key={d}
                    variant={index === currentDomain ? "default" : "outline"}
                    className="mx-1"
                  >
                    {index + 1}
                  </Badge>
                ))}
              </p>
            </div>

            {isLastQuestion ? (
              <Button 
                onClick={handleSubmit}
                disabled={saveResponsesMutation.isPending}
                data-testid="button-submit"
              >
                {saveResponsesMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Complete Assessment
                    <CheckIcon className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} data-testid="button-next">
                Next
                <ChevronRightIcon className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
