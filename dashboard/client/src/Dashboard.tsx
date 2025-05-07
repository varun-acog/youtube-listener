"use client";

import React, { useState } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Box,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Checkbox,
  useTheme,
  Theme,
  SxProps,
} from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";
import DescriptionIcon from "@mui/icons-material/Description";
import PersonIcon from "@mui/icons-material/Person";
import MicIcon from "@mui/icons-material/Mic";
import UpdateIcon from "@mui/icons-material/Update";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow"; // Added for Analyze button icon
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./index.css";

interface DashboardData {
  videoCount: number;
  transcriptCount: number;
  patientStoriesCount: number;
  kolInterviewsCount: number;
  lastUpdated: string;
}

interface VideoAnalysis {
  video: {
    video_id: string;
    search_name: string;
    title: string;
    description: string;
    published_date: string | null;
    duration_seconds: number;
    view_count: number;
    url: string;
    channel_name: string;
  };
  transcriptAvailable: boolean;
  analysis: {
    video_type: string;
    name: string | null;
    current_age: string | null;
    onset_age: string | null;
    sex: string | null;
    location: string | null;
    symptoms: any;
    medical_history_of_patient: any;
    family_medical_history: any;
    challenges_faced_during_diagnosis: any;
    key_opinion: string | null;
    topic_of_information: string | null;
    details_of_information: string | null;
    headline: string | null;
    summary_of_news: string | null;
  } | null;
}

interface ContentItem {
  video_id: string;
  title: string;
  description: string;
  url: string;
  published_date: string | null;
  view_count: number;
  video_type: string;
}

interface ApiResponse {
  type: "dashboardData" | "videoAnalysis" | "contentItems";
  data: DashboardData | VideoAnalysis | ContentItem[];
}

const Dashboard: React.FC = () => {
  const [searchName, setSearchName] = useState<string>("");
  const [therapeuticArea, setTherapeuticArea] = useState<string>("");
  const [contentType, setContentType] = useState<"youtube" | "web" | "">("");
  const [contentUrl, setContentUrl] = useState<string>("");
  const [desiredOutcomes, setDesiredOutcomes] = useState<{ patientStories: boolean; kolInterviews: boolean }>({
    patientStories: false,
    kolInterviews: false,
  });
  const [response, setResponse] = useState<
    | { type: "dashboardData"; data: DashboardData }
    | { type: "videoAnalysis"; data: VideoAnalysis }
    | null
  >(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newDiseaseRequest, setNewDiseaseRequest] = useState<boolean>(false);
  const [newDiseaseName, setNewDiseaseName] = useState<string>("");
  const [analyzing, setAnalyzing] = useState<boolean>(false); // Added for Analyze button loading state

  const navigate = useNavigate();
  const theme = useTheme<Theme>();

  // Define available therapeutic areas (same as radio button options)
  const availableTherapeuticAreas = ["friedreich ataxia", "migraine disorder", "atopic dermatitis"];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);
    setNewDiseaseRequest(false); // Reset new disease request form

    // Validate input: Ensure at least searchName or therapeuticArea is provided
    if (!searchName && !therapeuticArea) {
      setError("Please enter a search term or select a therapeutic area to proceed.");
      setLoading(false);
      return;
    }

    // Determine the effective search term
    const effectiveSearchName = searchName || therapeuticArea;

    // Check if the search term matches an available therapeutic area
    const searchTermLower = effectiveSearchName.toLowerCase();
    const isValidTherapeuticArea = availableTherapeuticAreas.includes(searchTermLower);

    if (!isValidTherapeuticArea) {
      setError(`Therapeutic area "${effectiveSearchName}" is not available. Please request to add it.`);
      setNewDiseaseName(effectiveSearchName); // Pre-fill the request form
      setNewDiseaseRequest(true); // Show the request form
      setLoading(false);
      return;
    }

    console.log("Submitting:", {
      searchName: effectiveSearchName,
      therapeuticArea,
      contentType,
      contentUrl,
      desiredOutcomes,
    });

    try {
      // Case 1: URL is provided (YouTube or Web URL) - Perform video analysis
      if (contentType && contentUrl) {
        const res = await axios.post("/api/dashboard", {
          searchName: effectiveSearchName,
          therapeuticArea: effectiveSearchName,
          contentType,
          contentUrl,
          desiredOutcomes: { patientStories: false, kolInterviews: false },
        });
        console.log("Response (Video Analysis):", res.data);
        setResponse(res.data);
      }
      // Case 2: Desired Outcomes (Patient Stories/KOL Interviews) are selected
      else if (desiredOutcomes.patientStories || desiredOutcomes.kolInterviews) {
        console.log("Triggering content items request for desired outcomes:", desiredOutcomes);
        const res = await axios.post("/api/dashboard", {
          searchName: effectiveSearchName,
          therapeuticArea: effectiveSearchName,
          contentType: "",
          contentUrl: "",
          desiredOutcomes,
        });
        console.log("Response (Content Items):", res.data);
        if (res.data.type !== "contentItems") {
          console.warn("Unexpected response type for content items request:", res.data.type);
          setError(`Expected content items but received ${res.data.type}. Please check the backend logic.`);
        } else {
          const contentTypeTitle =
            desiredOutcomes.patientStories && desiredOutcomes.kolInterviews
              ? "Patient Stories & KOL Interviews"
              : desiredOutcomes.patientStories
              ? "Patient Stories"
              : "KOL Interviews";
          navigate("/content-items", {
            state: { contentItems: res.data.data, contentTypeTitle },
          });
        }
      }
      // Case 3: Only therapeutic area/search term is provided - Show dashboard data
      else {
        const res = await axios.post("/api/dashboard", {
          searchName: effectiveSearchName,
          therapeuticArea: effectiveSearchName,
          contentType: "",
          contentUrl: "",
          desiredOutcomes: { patientStories: false, kolInterviews: false },
        });
        console.log("Response (Dashboard Data):", res.data);
        setResponse(res.data);
      }
    } catch (err: unknown) {
      console.error("Error:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred while fetching data";
      setError((err as any).response?.data?.error || errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!contentType || !contentUrl) {
      setError("Please select a content type and provide a URL to analyze.");
      return;
    }

    // Validate therapeutic area for web URLs
    const effectiveSearchName = searchName || therapeuticArea;
    if (contentType === "web" && !effectiveSearchName) {
      setError("Please select a therapeutic area for web URL analysis.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResponse(null);

    try {
      // Step 1: Run the analysis pipeline
      const analyzeResponse = await axios.post("/api/analyze", {
        contentType,
        contentUrl,
        therapeuticArea: effectiveSearchName,
      });
      console.log("Analyze Response:", analyzeResponse.data);

      // Step 2: Fetch the updated data
      if (contentType === "youtube") {
        // For YouTube, fetch video analysis
        const videoAnalysisResponse = await axios.post("/api/dashboard", {
          searchName: effectiveSearchName,
          therapeuticArea: effectiveSearchName,
          contentType,
          contentUrl,
          desiredOutcomes: { patientStories: false, kolInterviews: false },
        });
        console.log("Updated Video Analysis:", videoAnalysisResponse.data);
        setResponse(videoAnalysisResponse.data);
      } else {
        // For Web URL, fetch content items (since web pipeline doesn't store in DB)
        const contentItemsResponse = await axios.post("/api/dashboard", {
          searchName: effectiveSearchName,
          therapeuticArea: effectiveSearchName,
          contentType: "",
          contentUrl: "",
          desiredOutcomes: { patientStories: true, kolInterviews: false }, // Assuming web pipeline returns patient stories
        });
        console.log("Web Content Items:", contentItemsResponse.data);
        if (contentItemsResponse.data.type === "contentItems") {
          navigate("/content-items", {
            state: { contentItems: contentItemsResponse.data.data, contentTypeTitle: "Web Patient Stories" },
          });
        } else {
          setError("Failed to fetch web analysis results.");
        }
      }
    } catch (err: unknown) {
      console.error("Error during analysis:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred during analysis";
      setError((err as any).response?.data?.error || errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddNewDisease = async () => {
    if (!newDiseaseName) {
      setError("Please enter a disease name to request.");
      return;
    }
    try {
      console.log(`Requesting to add new disease: ${newDiseaseName}`);
      setNewDiseaseName("");
      setNewDiseaseRequest(false);
      alert(`Request to add "${newDiseaseName}" has been submitted!`);
    } catch (err) {
      setError("Failed to submit the request for a new disease.");
    }
  };

  const cardStyles: SxProps<Theme> = {
    backgroundColor: "var(--card-background)",
    borderRadius: "12px",
    boxShadow: "var(--shadow-md)",
    border: "1px solid var(--border-light)",
    transition: "all 0.3s ease",
    "&:hover": {
      boxShadow: "var(--shadow-lg)",
      transform: "translateY(-4px)",
    },
  };

  const statCardStyles: SxProps<Theme> = {
    ...cardStyles,
    position: "relative",
    overflow: "hidden",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      width: "4px",
      height: "100%",
      backgroundColor: "var(--primary-color)",
    },
  };

  const iconStyles: SxProps<Theme> = {
    fontSize: 32,
    color: "var(--primary-color)",
    backgroundColor: "rgba(42, 78, 122, 0.1)",
    padding: "10px",
    borderRadius: "8px",
    marginRight: "16px",
  };

  const buttonStyles: SxProps<Theme> = {
    height: "48px",
    backgroundColor: "var(--primary-color)",
    fontWeight: 600,
    textTransform: "none",
    borderRadius: "8px",
    "&:hover": {
      backgroundColor: "var(--primary-dark)",
      boxShadow: "var(--shadow-md)",
    },
    "&:disabled": {
      backgroundColor: "var(--text-tertiary)",
    },
  };

  const tableHeaderStyles: SxProps<Theme> = {
    backgroundColor: "var(--border-light)",
    "& th": {
      fontWeight: 600,
      color: "var(--text-primary)",
      padding: "14px",
    },
  };

  const tableRowStyles: SxProps<Theme> = {
    "&:nth-of-type(odd)": {
      backgroundColor: "rgba(245, 247, 250, 0.5)",
    },
    "&:hover": {
      backgroundColor: "rgba(42, 78, 122, 0.05)",
    },
    "& td": {
      padding: "14px",
      borderBottom: "1px solid var(--border-light)",
    },
  };

  const renderDashboardData = (data: DashboardData) => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card sx={statCardStyles}>
          <CardContent sx={{ pl: 3 }}>
            <Box display="flex" alignItems="center">
              <MovieIcon sx={iconStyles} />
              <Box>
                <Typography variant="body2" sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  Videos Available
                </Typography>
                <Typography variant="h4" sx={{ color: "var(--text-primary)", fontWeight: 700 }}>
                  {data.videoCount.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={statCardStyles}>
          <CardContent sx={{ pl: 3 }}>
            <Box display="flex" alignItems="center">
              <DescriptionIcon sx={iconStyles} />
              <Box>
                <Typography variant="body2" sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  Transcripts
                </Typography>
                <Typography variant="h4" sx={{ color: "var(--text-primary)", fontWeight: 700 }}>
                  {data.transcriptCount.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={statCardStyles}>
          <CardContent sx={{ pl: 3 }}>
            <Box display="flex" alignItems="center">
              <PersonIcon sx={iconStyles} />
              <Box>
                <Typography variant="body2" sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  Patient Stories
                </Typography>
                <Typography variant="h4" sx={{ color: "var(--text-primary)", fontWeight: 700 }}>
                  {data.patientStoriesCount.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={statCardStyles}>
          <CardContent sx={{ pl: 3 }}>
            <Box display="flex" alignItems="center">
              <MicIcon sx={iconStyles} />
              <Box>
                <Typography variant="body2" sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  KOL Interviews
                </Typography>
                <Typography variant="h4" sx={{ color: "var(--text-primary)", fontWeight: 700 }}>
                  {data.kolInterviewsCount.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={statCardStyles}>
          <CardContent sx={{ pl: 3 }}>
            <Box display="flex" alignItems="center">
              <UpdateIcon sx={iconStyles} />
              <Box>
                <Typography variant="body2" sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  Last Updated
                </Typography>
                <Typography variant="h5" sx={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {new Date(data.lastUpdated).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderVideoAnalysis = (data: VideoAnalysis) => {
    const videoId = data.video.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];

    return (
      <Box>
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            color: "var(--text-primary)",
            fontWeight: 700,
            mb: 3,
            display: "flex",
            alignItems: "center",
            "&::before": {
              content: '""',
              width: "20px",
              height: "3px",
              backgroundColor: "var(--primary-color)",
              mr: 2,
            },
          }}
        >
          Video Analysis
        </Typography>
        <Card sx={{ ...cardStyles, mb: 3 }}>
          <Box sx={{ p: 2, backgroundColor: "var(--border-light)", borderBottom: "1px solid var(--border-color)" }}>
            <Typography variant="h6" sx={{ color: "var(--text-primary)", fontWeight: 600 }}>
              Video Details
            </Typography>
          </Box>
          <CardContent sx={{ p: 0 }}>
            <List sx={{ py: 0 }}>
              <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)" }}>
                <ListItemText
                  primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Title</Typography>}
                  secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.video.title}</Typography>}
                />
              </ListItem>
              <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)", bgcolor: "rgba(245, 247, 250, 0.5)" }}>
                <ListItemText
                  primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Channel</Typography>}
                  secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.video.channel_name}</Typography>}
                />
              </ListItem>
              <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)" }}>
                <ListItemText
                  primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Published Date</Typography>}
                  secondary={
                    <Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>
                      {data.video.published_date ? new Date(data.video.published_date).toLocaleString() : "N/A"}
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)", bgcolor: "rgba(245, 247, 250, 0.5)" }}>
                <ListItemText
                  primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Duration</Typography>}
                  secondary={
                    <Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>
                      {`${Math.floor(data.video.duration_seconds / 60)}m ${data.video.duration_seconds % 60}s`}
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)" }}>
                <ListItemText
                  primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>View Count</Typography>}
                  secondary={
                    <Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>
                      {data.video.view_count?.toLocaleString() || "N/A"}
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)", bgcolor: "rgba(245, 247, 250, 0.5)" }}>
                <ListItemText
                  primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>URL</Typography>}
                  secondary={
                    <a href={data.video.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary-color)", fontWeight: 500 }}>
                      {data.video.url}
                    </a>
                  }
                />
              </ListItem>
              <ListItem sx={{ py: 2, px: 3 }}>
                <ListItemText
                  primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Description</Typography>}
                  secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.video.description || "N/A"}</Typography>}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {videoId && (
          <Card sx={{ ...cardStyles, mb: 3 }}>
            <Box sx={{ p: 2, backgroundColor: "var(--border-light)", borderBottom: "1px solid var(--border-color)" }}>
              <Typography variant="h6" sx={{ color: "var(--text-primary)", fontWeight: 600 }}>
                Video Player
              </Typography>
            </Box>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ position: "relative", paddingTop: "56.25%" /* 16:9 aspect ratio */ }}>
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                    borderRadius: "8px",
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        <Card sx={{ ...cardStyles, mb: 3 }}>
          <Box sx={{ p: 2, backgroundColor: "var(--border-light)", borderBottom: "1px solid var(--border-color)" }}>
            <Typography variant="h6" sx={{ color: "var(--text-primary)", fontWeight: 600 }}>
              Transcript Status
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Typography
              variant="body1"
              sx={{
                color: data.transcriptAvailable ? "var(--success-color)" : "var(--error-color)",
                bgcolor: data.transcriptAvailable ? "rgba(52, 199, 89, 0.1)" : "rgba(239, 68, 68, 0.1)",
                py: 1,
                px: 2,
                borderRadius: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                fontWeight: 500,
              }}
            >
              <DescriptionIcon fontSize="small" />
              {data.transcriptAvailable ? "Transcript Available" : "Transcript Not Available"}
            </Typography>
          </CardContent>
        </Card>

        {data.analysis ? (
          <Card sx={cardStyles}>
            <Box sx={{ p: 2, backgroundColor: "var(--border-light)", borderBottom: "1px solid var(--border-color)" }}>
              <Typography variant="h6" sx={{ color: "var(--text-primary)", fontWeight: 600 }}>
                Analysis
              </Typography>
            </Box>
            <CardContent sx={{ p: 0 }}>
              <List sx={{ py: 0 }}>
                <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)" }}>
                  <ListItemText
                    primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Video Type</Typography>}
                    secondary={
                      <Box
                        sx={{
                          mt: 0.5,
                          bgcolor: "rgba(42, 78, 122, 0.1)",
                          color: "var(--primary-color)",
                          py: 0.5,
                          px: 2,
                          borderRadius: "6px",
                          display: "inline-block",
                          fontWeight: 600,
                        }}
                      >
                        {data.analysis.video_type || "N/A"}
                      </Box>
                    }
                  />
                </ListItem>
                {data.analysis.video_type?.toLowerCase() === "patient story" && (
                  <>
                    <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)", bgcolor: "rgba(245, 247, 250, 0.5)" }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Name</Typography>}
                        secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.analysis.name || "N/A"}</Typography>}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)" }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Current Age</Typography>}
                        secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.analysis.current_age || "N/A"}</Typography>}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)", bgcolor: "rgba(245, 247, 250, 0.5)" }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Onset Age</Typography>}
                        secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.analysis.onset_age || "N/A"}</Typography>}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)" }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Sex</Typography>}
                        secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.analysis.sex || "N/A"}</Typography>}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)", bgcolor: "rgba(245, 247, 250, 0.5)" }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Location</Typography>}
                        secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.analysis.location || "N/A"}</Typography>}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)" }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Symptoms</Typography>}
                        secondary={
                          <Box
                            sx={{
                              mt: 1,
                              p: 2,
                              bgcolor: "var(--card-background)",
                              border: "1px solid var(--border-light)",
                              borderRadius: "6px",
                              maxHeight: "150px",
                              overflow: "auto",
                            }}
                          >
                            <Typography sx={{ color: "var(--text-primary)", fontFamily: "monospace", fontSize: "0.9rem" }}>
                              {data.analysis.symptoms ? JSON.stringify(data.analysis.symptoms, null, 2) : "N/A"}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)", bgcolor: "rgba(245, 247, 250, 0.5)" }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Medical History</Typography>}
                        secondary={
                          <Box
                            sx={{
                              mt: 1,
                              p: 2,
                              bgcolor: "var(--card-background)",
                              border: "1px solid var(--border-light)",
                              borderRadius: "6px",
                              maxHeight: "150px",
                              overflow: "auto",
                            }}
                          >
                            <Typography sx={{ color: "var(--text-primary)", fontFamily: "monospace", fontSize: "0.9rem" }}>
                              {data.analysis.medical_history_of_patient
                                ? JSON.stringify(data.analysis.medical_history_of_patient, null, 2)
                                : "N/A"}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)" }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Family Medical History</Typography>}
                        secondary={
                          <Box
                            sx={{
                              mt: 1,
                              p: 2,
                              bgcolor: "var(--card-background)",
                              border: "1px solid var(--border-light)",
                              borderRadius: "6px",
                              maxHeight: "150px",
                              overflow: "auto",
                            }}
                          >
                            <Typography sx={{ color: "var(--text-primary)", fontFamily: "monospace", fontSize: "0.9rem" }}>
                              {data.analysis.family_medical_history
                                ? JSON.stringify(data.analysis.family_medical_history, null, 2)
                                : "N/A"}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)", bgcolor: "rgba(245, 247, 250, 0.5)" }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Challenges Faced During Diagnosis</Typography>}
                        secondary={
                          <Box
                            sx={{
                              mt: 1,
                              p: 2,
                              bgcolor: "var(--card-background)",
                              border: "1px solid var(--border-light)",
                              borderRadius: "6px",
                              maxHeight: "150px",
                              overflow: "auto",
                            }}
                          >
                            <Typography sx={{ color: "var(--text-primary)", fontFamily: "monospace", fontSize: "0.9rem" }}>
                              {data.analysis.challenges_faced_during_diagnosis
                                ? JSON.stringify(data.analysis.challenges_faced_during_diagnosis, null, 2)
                                : "N/A"}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  </>
                )}
                {data.analysis.video_type?.toLowerCase() === "kol interview" && (
                  <ListItem sx={{ py: 2, px: 3, bgcolor: "rgba(245, 247, 250, 0.5)" }}>
                    <ListItemText
                      primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Key Opinion</Typography>}
                      secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.analysis.key_opinion || "N/A"}</Typography>}
                    />
                  </ListItem>
                )}
                {["informational", "Informational"].includes(data.analysis.video_type || "") && (
                  <>
                    <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)", bgcolor: "rgba(245, 247, 250, 0.5)" }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Topic of Information</Typography>}
                        secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.analysis.topic_of_information || "N/A"}</Typography>}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 2, px: 3 }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Details of Information</Typography>}
                        secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.analysis.details_of_information || "N/A"}</Typography>}
                      />
                    </ListItem>
                  </>
                )}
                {data.analysis.video_type === "News Bulletin" && (
                  <>
                    <ListItem sx={{ py: 2, px: 3, borderBottom: "1px solid var(--border-light)", bgcolor: "rgba(245, 247, 250, 0.5)" }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Headline</Typography>}
                        secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.analysis.headline || "N/A"}</Typography>}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 2, px: 3 }}>
                      <ListItemText
                        primary={<Typography sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>Summary of News</Typography>}
                        secondary={<Typography sx={{ color: "var(--text-primary)", mt: 0.5 }}>{data.analysis.summary_of_news || "N/A"}</Typography>}
                      />
                    </ListItem>
                  </>
                )}
              </List>
            </CardContent>
          </Card>
        ) : (
          <Card sx={cardStyles}>
            <Box sx={{ p: 2, backgroundColor: "var(--border-light)", borderBottom: "1px solid var(--border-color)" }}>
              <Typography variant="h6" sx={{ color: "var(--text-primary)", fontWeight: 600 }}>
                Analysis
              </Typography>
            </Box>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="body1"
                sx={{
                  color: "var(--error-color)",
                  bgcolor: "rgba(239, 68, 68, 0.1)",
                  py: 1,
                  px: 2,
                  borderRadius: "6px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  fontWeight: 500,
                }}
              >
                Analysis Not Available
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ mb: 5, textAlign: "center" }}>
        <Typography
          variant="h3"
          gutterBottom
          sx={{
            color: "var(--text-primary)",
            fontWeight: 700,
            fontSize: { xs: "2rem", md: "2.75rem" },
            "&::after": {
              content: '""',
              display: "block",
              width: "60px",
              height: "3px",
              backgroundColor: "var(--primary-color)",
              margin: "12px auto",
              borderRadius: "2px",
            },
          }}
        >
          Video Analysis Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: "var(--text-secondary)", maxWidth: "700px", mx: "auto", fontSize: "1.1rem" }}>
          Explore video analytics and content with a search term or URL
        </Typography>
      </Box>

      <Card sx={{ ...cardStyles, mb: 4, p: 3, borderTop: "3px solid var(--primary-color)" }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search Name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                variant="outlined"
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: "var(--text-secondary)", mr: 1 }} />,
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    "&:hover fieldset": { borderColor: "var(--primary-light)" },
                    "&.Mui-focused fieldset": { borderColor: "var(--primary-color)" },
                  },
                  "& .MuiInputLabel-root": { color: "var(--text-secondary)" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "var(--primary-color)" },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Button type="submit" variant="contained" fullWidth disabled={loading || analyzing} sx={buttonStyles}>
                {loading ? <CircularProgress size={20} color="inherit" /> : "Search"}
              </Button>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <FormControl component="fieldset">
              <FormLabel
                component="legend"
                sx={{
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  "&::before": {
                    content: '""',
                    width: "16px",
                    height: "2px",
                    backgroundColor: "var(--primary-color)",
                    mr: 1,
                  },
                }}
              >
                Therapeutic Areas Available
              </FormLabel>
              <RadioGroup
                row
                value={therapeuticArea}
                onChange={(e) => setTherapeuticArea(e.target.value)}
              >
                <FormControlLabel
                  value="friedreich ataxia"
                  control={<Radio sx={{ color: "var(--primary-color)", "&.Mui-checked": { color: "var(--primary-color)" } }} />}
                  label={<Typography sx={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Friedreich Ataxia</Typography>}
                />
                <FormControlLabel
                  value="migraine disorder"
                  control={<Radio sx={{ color: "var(--primary-color)", "&.Mui-checked": { color: "var(--primary-color)" } }} />}
                  label={<Typography sx={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Migraine Disorder</Typography>}
                />
                <FormControlLabel
                  value="atopic dermatitis"
                  control={<Radio sx={{ color: "var(--primary-color)", "&.Mui-checked": { color: "var(--primary-color)" } }} />}
                  label={<Typography sx={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Atopic Dermatitis</Typography>}
                />
              </RadioGroup>
            </FormControl>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setNewDiseaseRequest(true)}
                sx={{
                  color: "var(--primary-color)",
                  borderColor: "var(--primary-color)",
                  "&:hover": { borderColor: "var(--primary-dark)", backgroundColor: "rgba(42, 78, 122, 0.05)" },
                }}
              >
                Add a New Disease
              </Button>
              {newDiseaseRequest && (
                <Box sx={{ mt: 2, display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    label="New Disease Name"
                    value={newDiseaseName}
                    onChange={(e) => setNewDiseaseName(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "8px",
                        "&:hover fieldset": { borderColor: "var(--primary-light)" },
                        "&.Mui-focused fieldset": { borderColor: "var(--primary-color)" },
                      },
                      "& .MuiInputLabel-root": { color: "var(--text-secondary)" },
                      "& .MuiInputLabel-root.Mui-focused": { color: "var(--primary-color)" },
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddNewDisease}
                    sx={{ ...buttonStyles, height: "40px" }}
                  >
                    Submit Request
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => setNewDiseaseRequest(false)}
                    sx={{ color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ mt: 3 }}>
            <FormControl component="fieldset">
              <FormLabel
                component="legend"
                sx={{
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  "&::before": {
                    content: '""',
                    width: "16px",
                    height: "2px",
                    backgroundColor: "var(--primary-color)",
                    mr: 1,
                  },
                }}
              >
                Type of Content
              </FormLabel>
              <RadioGroup
                row
                value={contentType}
                onChange={(e) => setContentType(e.target.value as "youtube" | "web" | "")}
              >
                <FormControlLabel
                  value="youtube"
                  control={<Radio sx={{ color: "var(--primary-color)", "&.Mui-checked": { color: "var(--primary-color)" } }} />}
                  label={<Typography sx={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>YouTube URL</Typography>}
                />
                <FormControlLabel
                  value="web"
                  control={<Radio sx={{ color: "var(--primary-color)", "&.Mui-checked": { color: "var(--primary-color)" } }} />}
                  label={<Typography sx={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Web URL</Typography>}
                />
              </RadioGroup>
              {contentType && (
                <Box sx={{ display: "flex", gap: 2, alignItems: "center", mt: 2 }}>
                  <TextField
                    fullWidth
                    label={`${contentType === "youtube" ? "YouTube" : "Web"} URL`}
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "8px",
                        "&:hover fieldset": { borderColor: "var(--primary-light)" },
                        "&.Mui-focused fieldset": { borderColor: "var(--primary-color)" },
                      },
                      "& .MuiInputLabel-root": { color: "var(--text-secondary)" },
                      "& .MuiInputLabel-root.Mui-focused": { color: "var(--primary-color)" },
                    }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleAnalyze}
                    disabled={analyzing || loading || !contentUrl}
                    sx={{
                      ...buttonStyles,
                      height: "40px",
                      backgroundColor: "var(--secondary-color)",
                      "&:hover": { backgroundColor: "var(--secondary-dark)" },
                      "&:disabled": { backgroundColor: "var(--text-tertiary)" },
                    }}
                  >
                    {analyzing ? <CircularProgress size={20} color="inherit" /> : "Analyze"}
                  </Button>
                </Box>
              )}
            </FormControl>
          </Box>

          <Box sx={{ mt: 3 }}>
            <FormControl component="fieldset">
              <FormLabel
                component="legend"
                sx={{
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  "&::before": {
                    content: '""',
                    width: "16px",
                    height: "2px",
                    backgroundColor: "var(--primary-color)",
                    mr: 1,
                  },
                }}
              >
                Desired Outcomes
              </FormLabel>
              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={desiredOutcomes.patientStories}
                      onChange={(e) =>
                        setDesiredOutcomes((prev) => ({ ...prev, patientStories: e.target.checked }))
                      }
                      sx={{ color: "var(--primary-color)", "&.Mui-checked": { color: "var(--primary-color)" } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Patient Stories</Typography>}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={desiredOutcomes.kolInterviews}
                      onChange={(e) =>
                        setDesiredOutcomes((prev) => ({ ...prev, kolInterviews: e.target.checked }))
                      }
                      sx={{ color: "var(--primary-color)", "&.Mui-checked": { color: "var(--primary-color)" } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>KOL Interviews</Typography>}
                />
              </Box>
            </FormControl>
          </Box>
        </Box>
      </Card>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 4,
            borderRadius: "8px",
            bgcolor: "rgba(239, 68, 68, 0.05)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            "& .MuiAlert-icon": { color: "var(--error-color)" },
            "& .MuiAlert-message": { color: "var(--text-primary)", fontWeight: 500 },
          }}
        >
          {error}
        </Alert>
      )}

      {response && (
        <Box sx={{ opacity: loading || analyzing ? 0.6 : 1, transition: "opacity 0.3s ease" }}>
          {response.type === "dashboardData" && renderDashboardData(response.data as DashboardData)}
          {response.type === "videoAnalysis" && renderVideoAnalysis(response.data as VideoAnalysis)}
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;