from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import CSVUpload, Analysis
from .serializers import CSVUploadSerializer, AnalysisSerializer, PlotDataSerializer
import pandas as pd
import logging

logger = logging.getLogger(__name__)

# Create your views here.

class CSVUploadViewSet(viewsets.ModelViewSet):
    queryset = CSVUpload.objects.all()
    serializer_class = CSVUploadSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        csv_upload = serializer.instance
        file_path = csv_upload.file.path

        logger.info(f"Uploaded file path: {file_path}")

        try:
            df = pd.read_csv(file_path)
            columns = df.columns.tolist()
            logger.info(f"Extracted columns: {columns}")
            return Response({"id": serializer.instance.id, "columns": columns}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error processing file: {e}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AnalysisViewSet(viewsets.ModelViewSet):
    queryset = Analysis.objects.all()
    serializer_class = AnalysisSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import pandas as pd
import os

class PlotDataView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        logger.info(f"Incoming request payload: {request.data}")

        serializer = PlotDataSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        plot_type = validated_data.get('plot_type')
        x_axis = validated_data.get('x_axis')
        y_axes = validated_data.get('y_axes', [])
        csv_upload_id = validated_data.get('csv_upload_id')

        try:
            csv_upload = CSVUpload.objects.get(id=csv_upload_id, user=request.user)
            file_path = csv_upload.file.path

            df = pd.read_csv(file_path)

            # Basic validation for all plot types
            if plot_type in ['scatter', 'bar', 'line', 'area', 'heatmap', 'box']:
                if not x_axis or not y_axes:
                    return Response({"error": "x_axis and y_axes are required for this plot type."}, status=status.HTTP_400_BAD_REQUEST)
                if x_axis not in df.columns or any(y not in df.columns for y in y_axes):
                    return Response({"error": "Invalid columns selected for x_axis or y_axes."}, status=status.HTTP_400_BAD_REQUEST)

            data = []
            layout = {}

            if plot_type == 'pie':
                if not x_axis:
                    return Response({"error": "x_axis is required for pie charts."}, status=status.HTTP_400_BAD_REQUEST)
                if x_axis not in df.columns:
                    return Response({"error": "Invalid column selected for x_axis."}, status=status.HTTP_400_BAD_REQUEST)
                if y_axes and len(y_axes) > 1:
                    return Response({"error": "Pie chart supports only one Y-axis variable."}, status=status.HTTP_400_BAD_REQUEST)

                # Calculate value counts for pie chart
                value_counts = df[x_axis].value_counts()
                data = [{
                    "values": value_counts.values.tolist(),
                    "labels": value_counts.index.tolist(),
                    "type": "pie",
                }]
                layout = {"title": f"Pie Chart of {x_axis}"}

            elif plot_type == 'heatmap':
                # Handle null values by filling with 0
                df_filled = df.fillna(0)
                
                # Convert data to numeric if possible
                for col in [x_axis] + y_axes:
                    try:
                        df_filled[col] = pd.to_numeric(df_filled[col])
                    except:
                        pass
                
                # Create pivot table for heatmap
                try:
                    if len(y_axes) == 1:
                        # Single y-axis: use x_axis as rows and y_axis as values
                        pivot_data = df_filled.pivot_table(
                            values=y_axes[0],
                            index=x_axis,
                            aggfunc='mean'
                        )
                        data = [{
                            "z": [pivot_data.values.tolist()],
                            "x": [y_axes[0]],
                            "y": pivot_data.index.tolist(),
                            "type": "heatmap",
                            "colorscale": "Viridis",
                            "showscale": True
                        }]
                        layout = {
                            "title": f"Heatmap of {y_axes[0]} by {x_axis}",
                            "xaxis": {"title": y_axes[0]},
                            "yaxis": {"title": x_axis},
                            "height": 500,
                            "width": 800
                        }
                    else:
                        # Two y-axes: use first y_axis as values, second y_axis as columns
                        pivot_data = df_filled.pivot_table(
                            values=y_axes[0],  # First y_axis as values
                            index=x_axis,      # x_axis as rows
                            columns=y_axes[1], # Second y_axis as columns
                            aggfunc='mean'
                        )
                        
                        # Fill NaN values with 0
                        pivot_data = pivot_data.fillna(0)
                        
                        data = [{
                            "z": pivot_data.values.tolist(),
                            "x": pivot_data.columns.tolist(),
                            "y": pivot_data.index.tolist(),
                            "type": "heatmap",
                            "colorscale": "Viridis",
                            "showscale": True
                        }]
                        layout = {
                            "title": f"Heatmap of {y_axes[0]} by {x_axis} and {y_axes[1]}",
                            "xaxis": {"title": y_axes[1]},
                            "yaxis": {"title": x_axis},
                            "height": 500,
                            "width": 800
                        }
                    
                except Exception as e:
                    logger.error(f"Error creating heatmap: {str(e)}")
                    return Response({"error": "Could not create heatmap with the selected columns. Please ensure the data is suitable for a heatmap."}, status=status.HTTP_400_BAD_REQUEST)

            elif plot_type == 'box':
                for y_axis in y_axes:
                    data.append({
                        "y": df[y_axis].tolist(),
                        "type": "box",
                        "name": y_axis,
                    })
                layout = {
                    "title": f"Box Plot of {', '.join(y_axes)}",
                    "xaxis": {"title": "Variables"},
                    "yaxis": {"title": "Values"}
                }

            else:
                for y_axis in y_axes:
                    if plot_type == 'scatter':
                        data.append({
                            "x": df[x_axis].tolist(),
                            "y": df[y_axis].tolist(),
                            "type": "scatter",
                            "mode": "markers",
                            "name": y_axis,
                        })
                    elif plot_type == 'bar':
                        data.append({
                            "x": df[x_axis].tolist(),
                            "y": df[y_axis].tolist(),
                            "type": "bar",
                            "name": y_axis,
                        })
                    elif plot_type == 'line':
                        data.append({
                            "x": df[x_axis].tolist(),
                            "y": df[y_axis].tolist(),
                            "type": "scatter",
                            "mode": "lines",
                            "name": y_axis,
                        })
                    elif plot_type == 'area':
                        data.append({
                            "x": df[x_axis].tolist(),
                            "y": df[y_axis].tolist(),
                            "type": "scatter",
                            "fill": "tozeroy",
                            "mode": "lines",
                            "name": y_axis,
                        })

                layout = {
                    "title": f"{', '.join(y_axes)} vs {x_axis}",
                    "xaxis": {"title": x_axis},
                    "yaxis": {"title": "Values"}
                }

            return Response({"data": data, "layout": layout}, status=status.HTTP_200_OK)
        except CSVUpload.DoesNotExist:
            return Response({"error": "CSV file not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error generating plot: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GroupByView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        columns = request.data.get('columns', [])
        csv_upload_id = request.data.get('csv_upload_id')

        if not columns or not csv_upload_id:
            return Response({"error": "Missing required parameters."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            csv_upload = CSVUpload.objects.get(id=csv_upload_id, user=request.user)
            file_path = csv_upload.file.path

            df = pd.read_csv(file_path)

            results = {}
            for column in columns:
                if (column not in df.columns):
                    return Response({"error": f"Invalid column selected: {column}"}, status=status.HTTP_400_BAD_REQUEST)

                grouped_data = df.groupby(column).size().reset_index(name='count')
                results[column] = grouped_data.to_dict(orient='records')

            return Response(results, status=status.HTTP_200_OK)
        except CSVUpload.DoesNotExist:
            return Response({"error": "CSV file not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Analysis
from .serializers import AnalysisSerializer
from django.http import JsonResponse, HttpResponse
from django.core.files.base import ContentFile
import pdfkit

class AnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        analyses = Analysis.objects.filter(user=request.user)
        serializer = AnalysisSerializer(analyses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        serializer = AnalysisSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PublishAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        analysis_id = request.data.get('analysis_id')
        if not analysis_id:
            return Response({"error": "Analysis ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            analysis = Analysis.objects.get(id=analysis_id, user=request.user)
            html_content = f"""
            <html>
            <head><title>{analysis.title}</title></head>
            <body>
                <h1>{analysis.title}</h1>
                <p><strong>Author:</strong> {analysis.author_name}</p>
                <p><strong>Date:</strong> {analysis.date}</p>
                <p>{analysis.description}</p>
                <h2>Plots</h2>
                {''.join([f'<div><h3>{plot.get('title', 'Untitled')}</h3><p>{plot.get('description', '')}</p></div>' for plot in analysis.plots])}
            </body>
            </html>
            """
            pdf_file = pdfkit.from_string(html_content, False)
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{analysis.title}.pdf"'
            return response
        except Analysis.DoesNotExist:
            return Response({"error": "Analysis not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
