import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { jobService } from '../services/api';

const CardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
`;

const JobCard = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
`;

const JobTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #333;
`;

const JobMeta = styled.p`
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #666;

  strong {
    color: #333;
  }
`;

const Badge = styled.span`
  display: inline-block;
  background: #667eea;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  margin-top: 0.5rem;
`;

const Button = styled.button`
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
  font-weight: 500;

  &:hover {
    background: #5568d3;
  }
`;

interface Job {
  JobId: number;
  JobTitle: string;
  CivilDomain: string;
  Salary: number;
  JobLocation: string;
  JobDescription?: string;
}

interface JobListProps {
  onApply?: (jobId: number) => void;
}

const JobList: React.FC<JobListProps> = ({ onApply }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const response = await jobService.getJobs();
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading jobs...</div>;
  if (jobs.length === 0) return <div>No jobs available</div>;

  return (
    <CardContainer>
      {jobs.map((job) => (
        <JobCard key={job.JobId}>
          <JobTitle>{job.JobTitle}</JobTitle>
          <JobMeta>
            <strong>Domain:</strong> {job.CivilDomain}
          </JobMeta>
          <JobMeta>
            <strong>Location:</strong> {job.JobLocation}
          </JobMeta>
          <JobMeta>
            <strong>Salary:</strong> ${job.Salary?.toLocaleString() || 'N/A'}
          </JobMeta>
          <Badge>{job.CivilDomain}</Badge>
          {onApply && <Button onClick={() => onApply(job.JobId)}>Apply Now</Button>}
        </JobCard>
      ))}
    </CardContainer>
  );
};

export default JobList;
