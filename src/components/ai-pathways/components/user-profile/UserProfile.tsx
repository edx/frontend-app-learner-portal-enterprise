import React from 'react';
import {
  Card,
  Button,
  Row,
  Col,
  Badge,
} from '@openedx/paragon';
import type { LearnerProfile, CareerOption } from '../../services/pathways.types';

interface UserProfileProps {
  /** The learner profile data to display */
  profile: LearnerProfile;
  /** The currently selected career match */
  selectedCareer: CareerOption | null;
  /** Callback when a career match is selected */
  onSelectCareer: (career: CareerOption) => void;
  /** Callback to trigger pathway generation */
  onBuildPathway: () => void;
  /** Whether the pathway is currently being generated */
  isGenerating?: boolean;
}

/**
 * UserProfile component displays the generated learner profile and allows
 * the user to select a career match and trigger pathway generation.
 * Converted from Ionic to Paragon.
 */
export const UserProfile = ({
  profile,
  selectedCareer,
  onSelectCareer,
  onBuildPathway,
  isGenerating = false,
}: UserProfileProps) => {
  const {
    overview,
    careerGoal,
    targetIndustry,
    background,
    motivation,
    learningStyle,
    timeAvailable,
    certificate,
    careerMatches,
  } = profile;

  return (
    <div className="mx-auto" style={{ maxWidth: '900px' }}>
      <header className="mb-4 d-flex align-items-center">
        <div
          className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mr-3"
          style={{ width: '64px', height: '64px', fontSize: '24px' }}
        >
          MB
        </div>
        <div>
          <h2 className="h3 font-weight-bold mb-0">Mike Brown</h2>
          <p className="text-muted mb-0">Learner Profile</p>
        </div>
      </header>

      <Card className="mb-4 shadow-sm">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="h5 font-weight-bold mb-0">Your Profile</h3>
            <Button variant="link" size="sm" className="p-0">Edit</Button>
          </div>
          <p className="mb-4">{overview}</p>

          <Row className="mb-4">
            <Col md={6} className="mb-3 mb-md-0">
              <div className="small text-muted text-uppercase mb-1">Career Goal</div>
              <div className="font-weight-bold">{careerGoal}</div>
            </Col>
            <Col md={6}>
              <div className="small text-muted text-uppercase mb-1">Target Industry</div>
              <div className="font-weight-bold">{targetIndustry}</div>
            </Col>
          </Row>

          <div className="mb-4">
            <div className="small text-muted text-uppercase mb-1">Background</div>
            <p className="mb-0">{background}</p>
          </div>

          <div className="mb-4">
            <div className="small text-muted text-uppercase mb-1">Motivation</div>
            <p className="mb-0">{motivation}</p>
          </div>

          <hr className="my-4" />

          <Row>
            <Col xs={4} className="text-center border-right">
              <div className="small text-muted mb-1">Learning Style</div>
              <div className="font-weight-bold">{learningStyle}</div>
            </Col>
            <Col xs={4} className="text-center border-right">
              <div className="small text-muted mb-1">Time / Week</div>
              <div className="font-weight-bold">{timeAvailable}</div>
            </Col>
            <Col xs={4} className="text-center">
              <div className="small text-muted mb-1">Certificate</div>
              <div className="font-weight-bold">{certificate}</div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row>
        <Col lg={7} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="p-4">
              <h3 className="h5 font-weight-bold mb-3">Career Matches</h3>
              <p className="small text-muted mb-4">
                Based on your goals and current market trends, here are roles that align with your profile.
              </p>
              <div className="list-group">
                {careerMatches.map((match) => {
                  const isSelected = selectedCareer?.title === match.title;
                  return (
                    <Button
                      key={match.title}
                      variant={isSelected ? 'primary' : 'outline-primary'}
                      onClick={() => onSelectCareer(match)}
                      className="mb-2 w-100 text-left d-flex justify-content-between align-items-center"
                    >
                      <span className="font-weight-bold">{match.title}</span>
                      <Badge variant="info" className="ml-2">
                        {Math.round(match.percentMatch * 100)}% match
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="p-4">
              <h3 className="h5 font-weight-bold mb-3">Skills to Develop</h3>
              <p className="small text-muted mb-4">Key skills for your target roles.</p>
              <div className="d-flex flex-wrap gap-2">
                {selectedCareer?.skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="primary"
                    className="mb-2 mr-2 p-2"
                    style={{ backgroundColor: '#EBF5FB', color: '#1D4ED8', border: 'none' }}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="text-center mt-4">
        <Button
          variant="primary"
          size="lg"
          className="px-5 font-weight-bold"
          onClick={onBuildPathway}
          disabled={isGenerating || !selectedCareer}
        >
          {isGenerating ? 'Building Pathway...' : 'Build My Learning Pathway'}
        </Button>
        <div className="mt-3">
          <Button variant="outline-primary">Connect With An Advisor</Button>
        </div>
      </div>
    </div>
  );
};
