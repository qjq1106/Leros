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
	projectServerAddr string
	projectJSON       bool
	projectKeyword    string
	projectStatus     string
	projectOffset     int
	projectLimit      int
)

var projectCmd = &cobra.Command{
	Use:   "project",
	Short: "Manage projects",
	Long:  `Manage projects in the Leros platform.`,
}

var projectLsCmd = &cobra.Command{
	Use:   "ls",
	Short: "List projects",
	Long:  `List all projects with optional filtering.`,
	Run: func(cmd *cobra.Command, args []string) {
		go func() {
			req := &contract.ListProjectsRequest{
				Pagination: contract.ListProjectsRequest{}.Pagination,
			}
			req.Offset = projectOffset
			req.Limit = projectLimit
			req.Fill()

			if projectKeyword != "" {
				req.Keyword = &projectKeyword
			}
			if projectStatus != "" {
				req.Status = &projectStatus
			}

			result, err := cli.ListProjects(lifecycle.Std().Context(), projectServerAddr, req)
			if err != nil {
				logs.Errorf("list projects: %v", err)
				lifecycle.Std().Exit()
				return
			}
			printProjects(result)
			lifecycle.Std().Exit()
		}()
		lifecycle.Std().WaitExit()
	},
}

var projectGetCmd = &cobra.Command{
	Use:   "get <project_id>",
	Short: "Get project details",
	Long:  `Get detailed information about a specific project by its public ID.`,
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		go func() {
			publicID := args[0]
			result, err := cli.GetProject(lifecycle.Std().Context(), projectServerAddr, publicID)
			if err != nil {
				logs.Errorf("get project: %v", err)
				lifecycle.Std().Exit()
				return
			}
			printProjectDetail(result)
			lifecycle.Std().Exit()
		}()
		lifecycle.Std().WaitExit()
	},
}

func printProjects(list *contract.ProjectList) {
	if projectJSON {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		enc.Encode(list.Items)
		return
	}

	if len(list.Items) == 0 {
		fmt.Println("No projects found.")
		return
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 3, ' ', 0)
	fmt.Fprintln(w, "PUBLIC_ID\tNAME\tSTATUS\tCREATED_AT")
	for _, p := range list.Items {
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", p.PublicID, p.Name, p.Status, p.CreatedAt.Format("2006-01-02T15:04:05Z"))
	}
	w.Flush()

	fmt.Fprintf(os.Stderr, "\nTotal: %d, Offset: %d, Limit: %d\n", list.Total, list.Offset, list.Limit)
}

func printProjectDetail(p *contract.Project) {
	if projectJSON {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		enc.Encode(p)
		return
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 3, ' ', 0)
	fmt.Fprintf(w, "PublicID:\t%s\n", p.PublicID)
	fmt.Fprintf(w, "Name:\t%s\n", p.Name)
	fmt.Fprintf(w, "Description:\t%s\n", p.Description)
	fmt.Fprintf(w, "Objective:\t%s\n", p.Objective)
	fmt.Fprintf(w, "Status:\t%s\n", p.Status)
	fmt.Fprintf(w, "OwnerID:\t%d\n", p.OwnerID)
	fmt.Fprintf(w, "CreatedAt:\t%s\n", p.CreatedAt.Format("2006-01-02T15:04:05Z"))
	fmt.Fprintf(w, "UpdatedAt:\t%s\n", p.UpdatedAt.Format("2006-01-02T15:04:05Z"))
	w.Flush()
}

func init() {
	projectCmd.PersistentFlags().StringVar(&projectServerAddr, "server-addr", "127.0.0.1:8080", "Leros server address (host:port)")
	projectCmd.PersistentFlags().BoolVar(&projectJSON, "json", false, "Output in JSON format")

	projectLsCmd.Flags().StringVar(&projectKeyword, "keyword", "", "Filter by name keyword")
	projectLsCmd.Flags().StringVar(&projectStatus, "status", "", "Filter by status")
	projectLsCmd.Flags().IntVar(&projectOffset, "offset", 0, "Pagination offset")
	projectLsCmd.Flags().IntVar(&projectLimit, "limit", 20, "Pagination limit")

	projectCmd.AddCommand(projectLsCmd)
	projectCmd.AddCommand(projectGetCmd)
	rootCmd.AddCommand(projectCmd)
}
