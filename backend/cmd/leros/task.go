package main

import (
	"encoding/json"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/spf13/cobra"
	"github.com/ygpkg/yg-go/lifecycle"
	"github.com/ygpkg/yg-go/logs"

	"github.com/insmtx/Leros/backend/internal/api/contract"
	"github.com/insmtx/Leros/backend/internal/cli"
)

var (
	taskServerAddr string
	taskJSON       bool
	taskKeyword    string
	taskStatus     string
	taskProjectID  string
	taskType       string
	taskAssigneeID uint
	taskOffset     int
	taskLimit      int
)

var taskCmd = &cobra.Command{
	Use:   "task",
	Short: "Manage tasks",
	Long:  `Manage tasks in the Leros platform.`,
}

var taskLsCmd = &cobra.Command{
	Use:   "ls",
	Short: "List tasks",
	Long:  `List all tasks with optional filtering.`,
	Run: func(cmd *cobra.Command, args []string) {
		go func() {
			req := &contract.ListTasksRequest{
				Pagination: contract.ListTasksRequest{}.Pagination,
			}
			req.Offset = taskOffset
			req.Limit = taskLimit
			req.Fill()

			if taskKeyword != "" {
				req.Keyword = &taskKeyword
			}
			if taskStatus != "" {
				req.Status = &taskStatus
			}
			if cmd.Flags().Changed("project-id") {
				req.ProjectID = &taskProjectID
			}
			if taskType != "" {
				req.TaskType = &taskType
			}
			if cmd.Flags().Changed("assignee-id") {
				req.AssigneeID = &taskAssigneeID
			}

			result, err := cli.ListTasks(lifecycle.Std().Context(), taskServerAddr, req)
			if err != nil {
				logs.Errorf("list tasks: %v", err)
				lifecycle.Std().Exit()
				return
			}
			printTasks(result)
			lifecycle.Std().Exit()
		}()
		lifecycle.Std().WaitExit()
	},
}

var taskGetCmd = &cobra.Command{
	Use:   "get <task_id>",
	Short: "Get task details",
	Long:  `Get detailed information about a specific task by its public ID.`,
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		go func() {
			publicID := args[0]
			result, err := cli.GetTask(lifecycle.Std().Context(), taskServerAddr, publicID)
			if err != nil {
				logs.Errorf("get task: %v", err)
				lifecycle.Std().Exit()
				return
			}
			printTaskDetail(result)
			lifecycle.Std().Exit()
		}()
		lifecycle.Std().WaitExit()
	},
}

func printTasks(list *contract.TaskList) {
	if taskJSON {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		enc.Encode(list.Items)
		return
	}

	if len(list.Items) == 0 {
		fmt.Println("No tasks found.")
		return
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 3, ' ', 0)
	fmt.Fprintln(w, "PUBLIC_ID\tTITLE\tSTATUS\tTYPE\tPROJECT_ID\tCREATED_AT")
	for _, t := range list.Items {
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\t%s\n",
			t.PublicID, t.Title, t.Status, t.TaskType, t.ProjectID,
			t.CreatedAt.Format("2006-01-02T15:04:05Z"))
	}
	w.Flush()

	fmt.Fprintf(os.Stderr, "\nTotal: %d, Offset: %d, Limit: %d\n", list.Total, list.Offset, list.Limit)
}

func printTaskDetail(t *contract.Task) {
	if taskJSON {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		enc.Encode(t)
		return
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 3, ' ', 0)
	fmt.Fprintf(w, "PublicID:\t%s\n", t.PublicID)
	fmt.Fprintf(w, "Title:\t%s\n", t.Title)
	fmt.Fprintf(w, "Description:\t%s\n", t.Description)
	fmt.Fprintf(w, "Status:\t%s\n", t.Status)
	fmt.Fprintf(w, "TaskType:\t%s\n", t.TaskType)
	fmt.Fprintf(w, "OrgID:\t%d\n", t.OrgID)
	fmt.Fprintf(w, "OwnerID:\t%d\n", t.OwnerID)
	fmt.Fprintf(w, "ProjectID:\t%s\n", t.ProjectID)
	if t.AssigneeID != nil {
		fmt.Fprintf(w, "AssigneeID:\t%d\n", *t.AssigneeID)
	}
	if t.SessionID != nil {
		fmt.Fprintf(w, "SessionID:\t%d\n", *t.SessionID)
	}
	if t.Deadline != nil {
		fmt.Fprintf(w, "Deadline:\t%s\n", t.Deadline.Format("2006-01-02T15:04:05Z"))
	}
	fmt.Fprintf(w, "CreatedAt:\t%s\n", t.CreatedAt.Format("2006-01-02T15:04:05Z"))
	fmt.Fprintf(w, "UpdatedAt:\t%s\n", t.UpdatedAt.Format("2006-01-02T15:04:05Z"))
	w.Flush()
}

func init() {
	taskCmd.PersistentFlags().StringVar(&taskServerAddr, "server-addr", "127.0.0.1:8080", "Leros server address (host:port)")
	taskCmd.PersistentFlags().BoolVar(&taskJSON, "json", false, "Output in JSON format")

	taskLsCmd.Flags().StringVar(&taskKeyword, "keyword", "", "Filter by title/description keyword")
	taskLsCmd.Flags().StringVar(&taskStatus, "status", "", "Filter by status")
	taskLsCmd.Flags().StringVar(&taskProjectID, "project-id", "", "Filter by project ID")
	taskLsCmd.Flags().StringVar(&taskType, "type", "", "Filter by task type")
	taskLsCmd.Flags().UintVar(&taskAssigneeID, "assignee-id", 0, "Filter by assignee ID")
	taskLsCmd.Flags().IntVar(&taskOffset, "offset", 0, "Pagination offset")
	taskLsCmd.Flags().IntVar(&taskLimit, "limit", 20, "Pagination limit")

	taskCmd.AddCommand(taskLsCmd)
	taskCmd.AddCommand(taskGetCmd)
	rootCmd.AddCommand(taskCmd)
}
