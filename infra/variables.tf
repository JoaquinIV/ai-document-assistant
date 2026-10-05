variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "ai-assistant"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "task_cpu" {
  description = "Fargate task CPU units"
  type        = string
  default     = "512"
}

variable "task_memory" {
  description = "Fargate task memory (MB)"
  type        = string
  default     = "1024"
}

variable "min_tasks" {
  type    = number
  default = 1
}

variable "max_tasks" {
  description = "Upper bound for autoscaling under bursty AI usage."
  type        = number
  default     = 6
}

variable "llm_provider" {
  type    = string
  default = "openai"
}
